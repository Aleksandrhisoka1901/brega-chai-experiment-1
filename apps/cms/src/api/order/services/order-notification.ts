import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import Handlebars from "handlebars";
import { z } from "zod";

import type { OrderCreation, StoredOrder } from "./order-domain";

const recipientSchema = z.string().email();
const rubleFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const deliveryLabels = {
  courier: "Доставка",
  pickup: "Самовывоз",
} as const;

function getSiteOrigin(): string {
  const url = new URL(process.env.SITE_URL ?? "http://localhost:3000");

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password
  ) {
    throw new Error("SITE_URL must be a public HTTP(S) URL");
  }

  return url.origin;
}

type EmailAudience = "admin" | "customer";

type OrderEmailTemplateModel = {
  adminContacts: Array<{ label: string; value: string }>;
  address: string;
  addressLabel: string;
  comment: string;
  commentLabel: string;
  details: Array<{ label: string; value: string }>;
  discountPercent: number;
  eyebrow: string;
  finalTotal: string;
  hasDiscount: boolean;
  lead: string;
  lines: Array<{
    lineTotal: string;
    packageLabel: string;
    quantity: number;
    title: string;
    unitPrice: string;
  }>;
  method: string;
  orderNumber: string;
  preheader: string;
  siteUrl: string;
  standardTotal: string;
  title: string;
  totalLabel: string;
};

export type OrderEmailMessage = {
  subject: string;
  text: string;
  html: string;
};

function templateDirectory() {
  const relative = "src/api/order/services/templates";
  const candidates = [
    path.resolve(process.cwd(), relative),
    path.resolve(process.cwd(), "apps/cms", relative),
  ];
  const directory = candidates.find((candidate) => existsSync(candidate));

  if (!directory) {
    throw new Error("Order email templates are unavailable");
  }

  return directory;
}

function readTemplate(name: string) {
  return readFileSync(path.join(templateDirectory(), name), "utf8");
}

const htmlTemplate = Handlebars.compile<OrderEmailTemplateModel>(
  readTemplate("order.html.hbs"),
  { strict: true },
);
const adminTextTemplate = Handlebars.compile<OrderEmailTemplateModel>(
  readTemplate("admin.text.hbs"),
  { noEscape: true, strict: true },
);
const customerTextTemplate = Handlebars.compile<OrderEmailTemplateModel>(
  readTemplate("customer.text.hbs"),
  { noEscape: true, strict: true },
);

function formatMoney(value: number) {
  return rubleFormatter.format(value);
}

function customerLead(order: StoredOrder) {
  return order.deliveryMethod === "pickup"
    ? "Мы получили заказ и свяжемся с вами, когда он будет готов к выдаче."
    : "Мы получили заказ и скоро свяжемся с вами, чтобы подтвердить детали доставки.";
}

function buildTemplateModel(
  order: StoredOrder,
  audience: EmailAudience,
): OrderEmailTemplateModel {
  const isAdmin = audience === "admin";
  const method = deliveryLabels[order.deliveryMethod];
  const addressLabel =
    order.deliveryMethod === "pickup" ? "Адрес самовывоза" : "Адрес доставки";
  const adminContacts = isAdmin
    ? [
        { label: "Клиент", value: order.customer.name },
        { label: "Телефон", value: order.customer.phone },
        ...(order.customer.email
          ? [{ label: "Email", value: order.customer.email }]
          : []),
      ]
    : [];
  const title = isAdmin ? "Новый заказ" : "Спасибо за заказ";

  return {
    adminContacts,
    address: order.deliveryAddress,
    addressLabel,
    comment: order.comment ?? "",
    commentLabel: isAdmin ? "Комментарий клиента" : "Ваш комментарий",
    details: [
      ...adminContacts,
      { label: "Способ получения", value: method },
      { label: addressLabel, value: order.deliveryAddress },
    ],
    discountPercent: order.pickupDiscountPercent,
    eyebrow: isAdmin ? "Служебное уведомление" : "Подтверждение заказа",
    finalTotal: formatMoney(order.discountedTotalRubles),
    hasDiscount: order.pickupDiscountPercent > 0,
    lead: isAdmin
      ? "Заказ оформлен на сайте. Проверьте состав и свяжитесь с клиентом для подтверждения."
      : `${order.customer.name}, ${customerLead(order).toLocaleLowerCase("ru-RU")}`,
    lines: order.lines.map((line) => ({
      lineTotal: formatMoney(line.lineTotalRubles),
      packageLabel: line.packageLabel,
      quantity: line.quantity,
      title: line.title,
      unitPrice: formatMoney(line.unitPriceRubles),
    })),
    method,
    orderNumber: order.orderNumber,
    preheader: isAdmin
      ? `Новый заказ №${order.orderNumber} на сумму ${formatMoney(order.discountedTotalRubles)}`
      : `Заказ №${order.orderNumber} принят — ${method.toLocaleLowerCase("ru-RU")}`,
    siteUrl: getSiteOrigin(),
    standardTotal: formatMoney(order.totalRubles),
    title,
    totalLabel: order.pickupDiscountPercent > 0 ? "Итого со скидкой" : "Итого",
  };
}

export function buildAdminOrderNotification(
  order: StoredOrder,
): OrderEmailMessage {
  const model = buildTemplateModel(order, "admin");

  return {
    subject: `Новый заказ №${order.orderNumber} — Brega Tea`,
    text: adminTextTemplate(model).trim(),
    html: htmlTemplate(model).trim(),
  };
}

export const buildOrderNotification = buildAdminOrderNotification;

export function buildCustomerOrderConfirmation(
  order: StoredOrder,
): OrderEmailMessage {
  const model = buildTemplateModel(order, "customer");

  return {
    subject: `Заказ №${order.orderNumber} принят — Brega Tea`,
    text: customerTextTemplate(model).trim(),
    html: htmlTemplate(model).trim(),
  };
}

export async function sendOrderNotification({
  order,
  recipient,
  strapi,
}: {
  order: StoredOrder;
  recipient: string;
  strapi: any;
}) {
  const to = recipientSchema.parse(recipient);
  const message = buildAdminOrderNotification(order);
  await strapi
    .plugin("email")
    .service("email")
    .send({
      to,
      ...(order.customer.email ? { replyTo: order.customer.email } : {}),
      ...message,
    });
}

export async function sendCustomerOrderConfirmation({
  order,
  strapi,
}: {
  order: StoredOrder;
  strapi: any;
}) {
  if (!order.customer.email) return;

  const to = recipientSchema.parse(order.customer.email);
  await strapi
    .plugin("email")
    .service("email")
    .send({
      to,
      ...buildCustomerOrderConfirmation(order),
    });
}

export async function notifyOrderCreation({
  creation,
  recipient,
  strapi,
}: {
  creation: OrderCreation;
  recipient: string;
  strapi: any;
}) {
  if (!creation.created) return;

  const deliveries = [
    {
      audience: "admin",
      send: () =>
        sendOrderNotification({
          order: creation.order,
          recipient,
          strapi,
        }),
    },
    ...(creation.order.customer.email
      ? [
          {
            audience: "customer",
            send: () =>
              sendCustomerOrderConfirmation({
                order: creation.order,
                strapi,
              }),
          },
        ]
      : []),
  ];
  const results = await Promise.allSettled(
    deliveries.map((delivery) => delivery.send()),
  );

  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") continue;

    strapi.log.error("Order email notification failed", {
      audience: deliveries[index].audience,
      errorType:
        result.reason instanceof Error ? result.reason.name : "UnknownError",
      orderNumber: creation.order.orderNumber,
    });
  }
}
