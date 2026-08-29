import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminOrderNotification,
  buildCustomerOrderConfirmation,
  notifyOrderCreation,
  sendCustomerOrderConfirmation,
  sendOrderNotification,
} from "../src/api/order/services/order-notification.ts";
import type { StoredOrder } from "../src/api/order/services/order-domain.ts";

const order: StoredOrder = {
  orderId: "order-1",
  orderNumber: "2607-0001",
  idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
  requestFingerprint: "fingerprint",
  status: "new",
  customer: {
    name: "Анна <Чай>",
    phone: "+79991234567",
    email: "anna@example.test",
  },
  deliveryMethod: "pickup",
  deliveryAddress: "г. Москва, ул. Чайная, д. 1. Ежедневно с 10:00 до 22:00.",
  pickupDiscountPercent: 10,
  comment: "Позвонить & подтвердить",
  consents: {
    personalData: { accepted: true, documentVersion: "2026-07-28" },
    salesAndDelivery: { accepted: true, documentVersion: "2026-07-28" },
  },
  lines: [
    {
      stockRecordId: 1,
      productId: "product-1",
      slug: "tea-a1b2c3",
      title: "Чай",
      packageLabel: "50 г",
      unitPriceRubles: 1495,
      quantity: 1,
      lineTotalRubles: 1495,
      currency: "RUB",
    },
  ],
  currency: "RUB",
  totalRubles: 1495,
  discountedTotalRubles: 1346,
  statusHistory: [{ from: null, to: "new", at: "2026-07-31T12:00:00.000Z" }],
};

test("renders the admin order email in the Voltora visual language", () => {
  const previousSiteUrl = process.env.SITE_URL;
  const message = (() => {
    process.env.SITE_URL = "https://brega.example/storefront";
    try {
      return buildAdminOrderNotification(order);
    } finally {
      if (previousSiteUrl === undefined) delete process.env.SITE_URL;
      else process.env.SITE_URL = previousSiteUrl;
    }
  })();

  assert.equal(message.subject, "Новый заказ №2607-0001 — Voltora");
  assert.match(message.text, /Способ получения: Самовывоз/);
  assert.match(message.text, /Адрес самовывоза:/);
  assert.match(message.text, /Стандартная сумма: 1[\s\u00a0]495/);
  assert.match(message.text, /Скидка за самовывоз: 10%/);
  assert.match(message.text, /Сумма со скидкой: 1[\s\u00a0]346/);
  assert.match(message.html, /^<!doctype html>/);
  assert.match(message.html, /background: #efede4/);
  assert.match(message.html, /background: #24251e/);
  assert.match(message.html, /font-family: Georgia/);
  assert.match(message.html, /Служебное уведомление/);
  assert.doesNotMatch(message.html, /Анна <Чай>/);
  assert.match(message.html, /Анна &lt;Чай&gt;/);
  assert.match(message.html, /Позвонить &amp; подтвердить/);
  assert.doesNotMatch(message.text, /Ответьте на это письмо/);
  assert.doesNotMatch(message.html, /Ответьте на это письмо/);
  assert.equal(
    message.html.match(/href="https:\/\/brega\.example"/g)?.length,
    2,
  );
  assert.match(
    message.html,
    /style="color: #ffffff; text-decoration: none;"[^>]*>Voltora<\/a>/,
  );
  assert.match(
    message.html,
    /style="color: #c5b792; text-decoration: none;"[^>]*>Voltora<\/a>/,
  );
});

test("renders a customer confirmation without the admin-only contact block", () => {
  const message = buildCustomerOrderConfirmation(order);

  assert.equal(message.subject, "Заказ №2607-0001 принят — Voltora");
  assert.match(message.text, /^Спасибо за заказ/);
  assert.match(message.text, /свяжемся с вами, когда он будет готов к выдаче/);
  assert.match(message.html, /Подтверждение заказа/);
  assert.match(message.html, /Спасибо за заказ/);
  assert.doesNotMatch(message.html, /<td[^>]*>Телефон<\/td>/);
  assert.doesNotMatch(message.html, /anna@example\.test/);
  assert.match(message.html, /Анна &lt;Чай&gt;/);
  assert.doesNotMatch(message.text, /ответьте на это письмо/i);
  assert.doesNotMatch(message.html, /ответьте на это письмо/i);
});

test("uses Delivery as the customer-facing courier label", () => {
  const message = buildCustomerOrderConfirmation({
    ...order,
    deliveryMethod: "courier",
    deliveryAddress: "Москва, ул. Чайная, д. 2",
    pickupDiscountPercent: 0,
    discountedTotalRubles: order.totalRubles,
  });

  assert.match(message.text, /Способ получения: Доставка/);
  assert.doesNotMatch(message.text, /Способ получения: Курьер/);
  assert.match(message.html, />Доставка<\/td>/);
});

test("omits discount details when the order has no pickup discount", () => {
  const message = buildAdminOrderNotification({
    ...order,
    pickupDiscountPercent: 0,
    discountedTotalRubles: order.totalRubles,
  });

  assert.doesNotMatch(message.text, /скидк/iu);
  assert.doesNotMatch(message.html, /скидк/iu);
  assert.match(message.text, /Сумма заказа: 1[\s\u00a0]495/);
  assert.match(message.html, />Итого</);
});

test("sends the admin email to the configured address with customer reply-to", async () => {
  const calls: unknown[] = [];
  await sendOrderNotification({
    order,
    recipient: "orders@example.test",
    strapi: {
      plugin: () => ({
        service: () => ({
          send: async (message: unknown) => calls.push(message),
        }),
      }),
    },
  });

  assert.equal(calls.length, 1);
  assert.equal((calls[0] as any).to, "orders@example.test");
  assert.equal((calls[0] as any).replyTo, "anna@example.test");
  assert.match((calls[0] as any).html, /Служебное уведомление/);
});

test("sends the customer confirmation only to the order email", async () => {
  const calls: unknown[] = [];
  await sendCustomerOrderConfirmation({
    order,
    strapi: {
      plugin: () => ({
        service: () => ({
          send: async (message: unknown) => calls.push(message),
        }),
      }),
    },
  });

  assert.equal(calls.length, 1);
  assert.equal((calls[0] as any).to, "anna@example.test");
  assert.equal((calls[0] as any).replyTo, undefined);
  assert.match((calls[0] as any).html, /Подтверждение заказа/);
});

test("rejects an invalid configured recipient before invoking the provider", async () => {
  let called = false;
  await assert.rejects(
    sendOrderNotification({
      order,
      recipient: "not-an-email",
      strapi: {
        plugin: () => ({
          service: () => ({
            send: async () => {
              called = true;
            },
          }),
        }),
      },
    }),
  );
  assert.equal(called, false);
});

test("notifies both audiences once and isolates an admin delivery failure", async () => {
  const sent: string[] = [];
  const logs: unknown[] = [];
  const strapi = {
    log: { error: (...args: unknown[]) => logs.push(args) },
    plugin: () => ({
      service: () => ({
        send: async (message: { to: string }) => {
          sent.push(message.to);
          if (message.to === "orders@example.test") {
            throw new Error("provider unavailable for orders@example.test");
          }
        },
      }),
    }),
  };

  await notifyOrderCreation({
    creation: { created: false, order, result: {} as never },
    recipient: "orders@example.test",
    strapi,
  });
  await notifyOrderCreation({
    creation: { created: true, order, result: {} as never },
    recipient: "orders@example.test",
    strapi,
  });

  assert.deepEqual(sent.sort(), ["anna@example.test", "orders@example.test"]);
  assert.equal(logs.length, 1);
  assert.match(JSON.stringify(logs), /"audience":"admin"/);
  assert.equal(JSON.stringify(logs).includes("orders@example.test"), false);
  assert.equal(JSON.stringify(logs).includes("2607-0001"), true);
});

test("does not attempt a customer email when checkout omitted it", async () => {
  const recipients: string[] = [];
  await notifyOrderCreation({
    creation: {
      created: true,
      order: { ...order, customer: { ...order.customer, email: undefined } },
      result: {} as never,
    },
    recipient: "orders@example.test",
    strapi: {
      log: { error: () => undefined },
      plugin: () => ({
        service: () => ({
          send: async (message: { to: string }) => recipients.push(message.to),
        }),
      }),
    },
  });

  assert.deepEqual(recipients, ["orders@example.test"]);
});
