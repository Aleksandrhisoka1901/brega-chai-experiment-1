import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOrderNotification,
  notifyOrderCreation,
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

test("builds a Brega Tea notification with fulfillment and both totals", () => {
  const message = buildOrderNotification(order);

  assert.equal(message.subject, "Новый заказ №2607-0001 — Brega Tea");
  assert.match(message.text, /Способ: Самовывоз/);
  assert.match(message.text, /Адрес самовывоза:/);
  assert.match(message.text, /Стандартная сумма: 1[\s\u00a0]495/);
  assert.match(message.text, /Скидка за самовывоз: 10%/);
  assert.match(message.text, /Сумма со скидкой: 1[\s\u00a0]346/);
  assert.doesNotMatch(message.html, /Анна <Чай>/);
  assert.match(message.html, /Анна &lt;Чай&gt;/);
  assert.match(message.html, /Позвонить &amp; подтвердить/);
});

test("sends only to the configured admin address and uses customer email as reply-to", async () => {
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
});

test("rejects an invalid configured recipient before invoking SMTP", async () => {
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

test("notifies only a newly created order and contains SMTP failures", async () => {
  const sent: string[] = [];
  const logs: unknown[] = [];
  const strapi = {
    log: { error: (...args: unknown[]) => logs.push(args) },
    plugin: () => ({
      service: () => ({
        send: async () => {
          sent.push(order.orderNumber);
          throw new Error("smtp unavailable for orders@example.test");
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

  assert.deepEqual(sent, ["2607-0001"]);
  assert.equal(logs.length, 1);
  assert.equal(JSON.stringify(logs).includes("orders@example.test"), false);
  assert.equal(JSON.stringify(logs).includes("2607-0001"), true);
});
