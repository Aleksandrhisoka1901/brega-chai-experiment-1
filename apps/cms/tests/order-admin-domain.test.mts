import assert from "node:assert/strict";
import test from "node:test";

import domain from "../src/plugins/order-admin/server/src/domain.js";

const order = {
  id: 7,
  documentId: "order-document",
  orderNumber: "BC-100",
  idempotencyKey: "private-idempotency-key",
  requestFingerprint: "private-request-fingerprint",
  orderStatus: "new",
  customerName: "Анна",
  customerPhone: "+79991234567",
  customerEmail: "anna@example.com",
  deliveryMethod: "pickup",
  deliveryAddress: "Москва, Чайная улица, 1",
  pickupDiscountPercent: 10,
  comment: "Позвонить перед доставкой",
  managerComment: "Дополнительный телефон: +79990000000",
  consents: {
    personalData: { accepted: true, documentVersion: "2026-07" },
    salesAndDelivery: { accepted: true, documentVersion: "2026-07" },
  },
  lines: [
    {
      productId: "product-document",
      stockRecordId: 42,
      slug: "da-hun-pao-a1b2c3",
      title: "Да Хун Пао",
      packageLabel: "50 г",
      unitPriceRubles: 1600,
      quantity: 2,
      lineTotalRubles: 3200,
      currency: "RUB",
    },
  ],
  currency: "RUB",
  totalRubles: 3200,
  discountedTotalRubles: 2880,
  statusHistory: [{ from: null, to: "new", at: "2026-07-30T12:00:00.000Z" }],
  createdAt: "2026-07-30T12:00:00.000Z",
  updatedAt: "2026-07-30T12:00:00.000Z",
};

test("list DTO exposes operational summary without PII or technical keys", () => {
  const result = domain.mapOrderListItem(order);

  assert.deepEqual(result, {
    documentId: "order-document",
    orderNumber: "BC-100",
    createdAt: "2026-07-30T12:00:00.000Z",
    customerName: "Анна",
    status: "new",
    lineCount: 1,
    unitCount: 2,
    currency: "RUB",
    totalRubles: 3200,
    discountedTotalRubles: 2880,
  });
  assert.equal(JSON.stringify(result).includes("+7999"), false);
  assert.equal(JSON.stringify(result).includes("idempotency"), false);
});

test("detail DTO removes stock and request internals but keeps immutable snapshots", () => {
  const result = domain.mapOrderDetail(order);

  assert.deepEqual(result.customer, {
    name: "Анна",
    phone: "+79991234567",
    email: "anna@example.com",
  });
  assert.deepEqual(result.availableStatusTransitions, [
    "confirmed",
    "cancelled",
  ]);
  assert.equal(result.lines[0]?.lineTotalRubles, 3200);
  assert.equal(result.deliveryMethod, "pickup");
  assert.equal(result.deliveryAddress, "Москва, Чайная улица, 1");
  assert.equal(result.pickupDiscountPercent, 10);
  assert.equal(result.totalRubles, 3200);
  assert.equal(result.discountedTotalRubles, 2880);
  assert.equal(result.managerComment, "Дополнительный телефон: +79990000000");
  assert.equal(result.editable, true);
  assert.equal("stockRecordId" in result.lines[0]!, false);
  assert.equal(JSON.stringify(result).includes("requestFingerprint"), false);
  assert.equal(JSON.stringify(result).includes("idempotencyKey"), false);
});

test("detail DTO accepts quantities above the public cart limit", () => {
  const result = domain.mapOrderDetail({
    ...order,
    lines: [
      {
        ...order.lines[0],
        quantity: 250,
        lineTotalRubles: 400000,
      },
    ],
    totalRubles: 400000,
    discountedTotalRubles: 360000,
  });

  assert.equal(result.lines[0].quantity, 250);
});

test("detail DTO exposes the administrator snapshot in status history", () => {
  const actor = { id: "7", name: "Анна Менеджер" };
  const result = domain.mapOrderDetail({
    ...order,
    statusHistory: [
      ...order.statusHistory,
      {
        from: "new",
        to: "confirmed",
        at: "2026-07-30T12:10:00.000Z",
        actor,
      },
    ],
  });

  assert.deepEqual(result.statusHistory[1].actor, actor);
});

test("terminal states have no available transitions", () => {
  assert.deepEqual(
    domain.mapOrderDetail({ ...order, orderStatus: "completed" })
      .availableStatusTransitions,
    [],
  );
  assert.equal(
    domain.mapOrderDetail({ ...order, orderStatus: "completed" }).editable,
    false,
  );
  assert.deepEqual(
    domain.mapOrderDetail({ ...order, orderStatus: "cancelled" })
      .availableStatusTransitions,
    [],
  );
});

test("edit command ignores the public cart limit and requires unique products", () => {
  const command = {
    expectedUpdatedAt: "2026-08-03T10:00:00.000Z",
    deliveryAddress: "Москва, ул. Новая, 2",
    managerComment: "Позвонить вечером",
    items: [{ productId: "product-1", quantity: 2 }],
  };
  assert.deepEqual(domain.parseEditCommand(command), command);
  assert.equal(
    domain.parseEditCommand({
      ...command,
      items: [{ productId: "product-1", quantity: 250 }],
    }).items[0].quantity,
    250,
  );
  assert.throws(() =>
    domain.parseEditCommand({
      ...command,
      items: [...command.items, ...command.items],
    }),
  );
  assert.throws(() =>
    domain.parseEditCommand({ ...command, deliveryAddress: "" }),
  );
  assert.throws(() => domain.parseEditCommand({ ...command, force: true }));
});

test("product search query is narrow and optional", () => {
  assert.deepEqual(domain.parseProductQuery({}), {});
  assert.deepEqual(domain.parseProductQuery({ search: "  ритуал  " }), {
    search: "ритуал",
  });
  assert.throws(() => domain.parseProductQuery({ limit: 1000 }));
});

test("list query applies bounded defaults and rejects unknown or inverted input", () => {
  assert.deepEqual(domain.parseListQuery({}), { page: 1, pageSize: 25 });
  assert.deepEqual(domain.parseListQuery({ page: "2", pageSize: "50" }), {
    page: 2,
    pageSize: 50,
  });
  assert.throws(() => domain.parseListQuery({ pageSize: "101" }));
  assert.throws(() => domain.parseListQuery({ unknown: "value" }));
  assert.throws(() =>
    domain.parseListQuery({
      createdFrom: "2026-08-01T00:00:00.000Z",
      createdTo: "2026-07-01T00:00:00.000Z",
    }),
  );
});

test("status command accepts one known status and rejects arbitrary data", () => {
  assert.deepEqual(domain.parseStatusCommand({ status: "confirmed" }), {
    status: "confirmed",
  });
  assert.throws(() => domain.parseStatusCommand({ status: "paid" }));
  assert.throws(() =>
    domain.parseStatusCommand({ status: "confirmed", force: true }),
  );
});

test("admin document id rejects empty and structural input", () => {
  assert.equal(
    domain.parseDocumentId("ahwc7pxi66m4j4xtya2vto7q"),
    "ahwc7pxi66m4j4xtya2vto7q",
  );
  assert.throws(() => domain.parseDocumentId(""));
  assert.throws(() => domain.parseDocumentId("../orders"));
});
