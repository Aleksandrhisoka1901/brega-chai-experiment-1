import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionOrderStatus,
  createOrderInputSchema,
  DEFAULT_MAX_ITEM_QUANTITY,
  MAX_ORDER_ITEM_QUANTITY,
  isOrderQuantityAvailable,
  orderResultSchema,
  orderStatusSchema,
  stockSchema,
} from "../src/order.ts";

const validInput = {
  idempotencyKey: "d9428888-122b-4dbb-bc09-3d1464b35f9d",
  customer: {
    name: "Анна",
    phone: "+79991234567",
    email: "anna@example.com",
  },
  deliveryMethod: "courier",
  deliveryAddress: "Москва, ул. Чайная, д. 1, кв. 2",
  comment: "Позвонить перед доставкой",
  consents: {
    personalData: { accepted: true, documentVersion: "2026-07-28" },
    salesAndDelivery: { accepted: true, documentVersion: "2026-07-28" },
  },
  items: [{ productId: "product-1", quantity: 2 }],
};

test("accepts the complete browser order payload", () => {
  assert.deepEqual(createOrderInputSchema.parse(validInput), validInput);
});

test("accepts omitted optional email and comment", () => {
  const { comment: _comment, ...withoutComment } = validInput;
  const result = createOrderInputSchema.safeParse({
    ...withoutComment,
    customer: {
      name: validInput.customer.name,
      phone: validInput.customer.phone,
    },
  });

  assert.equal(result.success, true);
});

test("requires a UUID idempotency key, E.164 phone and delivery address", () => {
  assert.equal(
    createOrderInputSchema.safeParse({
      ...validInput,
      idempotencyKey: "retry-1",
    }).success,
    false,
  );
  assert.equal(
    createOrderInputSchema.safeParse({
      ...validInput,
      customer: { ...validInput.customer, phone: "8 999 123-45-67" },
    }).success,
    false,
  );
  assert.equal(
    createOrderInputSchema.safeParse({
      ...validInput,
      deliveryAddress: " ",
    }).success,
    false,
  );
});

test("requires both accepted consent versions", () => {
  assert.equal(
    createOrderInputSchema.safeParse({
      ...validInput,
      consents: {
        ...validInput.consents,
        personalData: {
          accepted: false,
          documentVersion: "2026-07-28",
        },
      },
    }).success,
    false,
  );
});

test("accepts integer quantities up to the hard transport safety limit", () => {
  for (const quantity of [0, 1.5, MAX_ORDER_ITEM_QUANTITY + 1]) {
    assert.equal(
      createOrderInputSchema.safeParse({
        ...validInput,
        items: [{ productId: "product-1", quantity }],
      }).success,
      false,
    );
  }

  for (const quantity of [
    1,
    DEFAULT_MAX_ITEM_QUANTITY,
    MAX_ORDER_ITEM_QUANTITY,
  ]) {
    assert.equal(
      createOrderInputSchema.safeParse({
        ...validInput,
        items: [{ productId: "product-1", quantity }],
      }).success,
      true,
    );
  }
});

test("checks quantity against a non-negative integer server stock", () => {
  assert.equal(stockSchema.safeParse(0).success, true);
  assert.equal(stockSchema.safeParse(-1).success, false);
  assert.equal(stockSchema.safeParse(1.5).success, false);

  assert.equal(isOrderQuantityAvailable(1, 1), true);
  assert.equal(isOrderQuantityAvailable(2, 1), false);
  assert.equal(isOrderQuantityAvailable(5, 10), true);
  assert.equal(isOrderQuantityAvailable(6, 10), false);
  assert.equal(isOrderQuantityAvailable(6, 10, 8), true);
  assert.equal(isOrderQuantityAvailable(9, 10, 8), false);
});

test("rejects browser-supplied commercial values and duplicate products", () => {
  assert.equal(
    createOrderInputSchema.safeParse({
      ...validInput,
      items: [
        {
          productId: "product-1",
          quantity: 2,
          unitPriceRubles: 1,
          currency: "RUB",
        },
      ],
    }).success,
    false,
  );
  assert.equal(
    createOrderInputSchema.safeParse({
      ...validInput,
      items: [
        { productId: "product-1", quantity: 1 },
        { productId: "product-1", quantity: 2 },
      ],
    }).success,
    false,
  );
});

test("accepts a server result with immutable integer-RUB line snapshots", () => {
  const result = {
    orderId: "order-1",
    orderNumber: "2607-0001",
    status: "new",
    deliveryMethod: "courier",
    pickupDiscountPercent: 0,
    currency: "RUB",
    lines: [
      {
        productId: "product-1",
        slug: "da-hun-pao-a1b2c3",
        title: "Да Хун Пао",
        packageLabel: "50 г",
        unitPriceRubles: 1600,
        quantity: 2,
        lineTotalRubles: 3200,
        currency: "RUB",
      },
    ],
    totalRubles: 3200,
    discountedTotalRubles: 3200,
  };

  assert.deepEqual(orderResultSchema.parse(result), result);
  assert.equal(
    orderResultSchema.safeParse({
      ...result,
      lines: [{ ...result.lines[0], unitPriceRubles: 1600.5 }],
    }).success,
    false,
  );
  assert.equal(
    orderResultSchema.safeParse({ ...result, currency: "USD" }).success,
    false,
  );
  assert.equal(
    orderResultSchema.safeParse({ ...result, totalRubles: 1 }).success,
    false,
  );
  assert.equal(
    orderResultSchema.safeParse({
      ...result,
      lines: [{ ...result.lines[0], lineTotalRubles: 1 }],
    }).success,
    false,
  );
});

test("defines the approved statuses and transitions", () => {
  assert.deepEqual(orderStatusSchema.options, [
    "new",
    "confirmed",
    "completed",
    "cancelled",
  ]);

  assert.equal(canTransitionOrderStatus("new", "confirmed"), true);
  assert.equal(canTransitionOrderStatus("new", "cancelled"), true);
  assert.equal(canTransitionOrderStatus("confirmed", "completed"), true);
  assert.equal(canTransitionOrderStatus("confirmed", "cancelled"), true);

  assert.equal(canTransitionOrderStatus("new", "completed"), false);
  assert.equal(canTransitionOrderStatus("completed", "cancelled"), false);
  assert.equal(canTransitionOrderStatus("cancelled", "new"), false);
});
