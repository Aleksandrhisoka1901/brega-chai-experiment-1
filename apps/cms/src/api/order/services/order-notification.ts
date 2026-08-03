import { z } from "zod";

import type { OrderCreation, StoredOrder } from "./order-domain";

const recipientSchema = z.string().email();
const rubleFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const deliveryLabels = {
  courier: "Курьер",
  pickup: "Самовывоз",
} as const;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatLines(order: StoredOrder) {
  return order.lines.map(
    (line) =>
      `${line.title} (${line.packageLabel}) — ${line.quantity} шт. × ${rubleFormatter.format(line.unitPriceRubles)} = ${rubleFormatter.format(line.lineTotalRubles)}`,
  );
}

export function buildOrderNotification(order: StoredOrder) {
  const method = deliveryLabels[order.deliveryMethod];
  const contact = [order.customer.phone, order.customer.email]
    .filter(Boolean)
    .join(" | ");
  const addressLabel =
    order.deliveryMethod === "pickup" ? "Адрес самовывоза" : "Адрес доставки";
  const lines = formatLines(order);
  const hasPickupDiscount = order.pickupDiscountPercent > 0;
  const totalLines = hasPickupDiscount
    ? [
        `Стандартная сумма: ${rubleFormatter.format(order.totalRubles)}`,
        `Скидка за самовывоз: ${order.pickupDiscountPercent}%`,
        `Сумма со скидкой: ${rubleFormatter.format(order.discountedTotalRubles)}`,
      ]
    : [`Сумма заказа: ${rubleFormatter.format(order.totalRubles)}`];

  const text = [
    `Новый заказ №${order.orderNumber}`,
    "",
    `Способ: ${method}`,
    `Клиент: ${order.customer.name}`,
    `Контакты: ${contact}`,
    `${addressLabel}: ${order.deliveryAddress}`,
    ...(order.comment ? [`Комментарий: ${order.comment}`] : []),
    "",
    "Состав заказа:",
    ...lines.map((line) => `• ${line}`),
    "",
    ...totalLines,
  ].join("\n");

  const htmlLines = lines
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  const html = [
    `<h1>Новый заказ №${escapeHtml(order.orderNumber)}</h1>`,
    `<p><strong>Способ:</strong> ${method}<br>`,
    `<strong>Клиент:</strong> ${escapeHtml(order.customer.name)}<br>`,
    `<strong>Контакты:</strong> ${escapeHtml(contact)}<br>`,
    `<strong>${addressLabel}:</strong> ${escapeHtml(order.deliveryAddress)}</p>`,
    ...(order.comment
      ? [`<p><strong>Комментарий:</strong> ${escapeHtml(order.comment)}</p>`]
      : []),
    `<h2>Состав заказа</h2><ul>${htmlLines}</ul>`,
    hasPickupDiscount
      ? `<p><strong>Стандартная сумма:</strong> ${escapeHtml(rubleFormatter.format(order.totalRubles))}<br><strong>Скидка за самовывоз: ${order.pickupDiscountPercent}%</strong><br><strong>Сумма со скидкой:</strong> ${escapeHtml(rubleFormatter.format(order.discountedTotalRubles))}</p>`
      : `<p><strong>Сумма заказа:</strong> ${escapeHtml(rubleFormatter.format(order.totalRubles))}</p>`,
  ].join("");

  return {
    subject: `Новый заказ №${order.orderNumber} — Brega Tea`,
    text,
    html,
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
  const message = buildOrderNotification(order);
  await strapi
    .plugin("email")
    .service("email")
    .send({
      to,
      ...(order.customer.email ? { replyTo: order.customer.email } : {}),
      ...message,
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

  try {
    await sendOrderNotification({
      order: creation.order,
      recipient,
      strapi,
    });
  } catch (error) {
    strapi.log.error("Order email notification failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
      orderNumber: creation.order.orderNumber,
    });
  }
}
