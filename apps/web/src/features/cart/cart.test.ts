import assert from "node:assert/strict";
import test from "node:test";

import {
  addItem,
  clearCart,
  createEmptyCart,
  removeItem,
  updateItemQuantity,
} from "./model.ts";
import type { CartProduct } from "./types.ts";

const product: CartProduct = {
  productId: "product-1",
  slug: "da-hun-pao",
  type: "tovar",
  title: "Да Хун Пао",
  packageLabel: "50 г",
  unitPriceSnapshot: 1600,
  currency: "RUB",
  image: { url: "/tea.png", alt: "Чай Да Хун Пао" },
  stock: 3,
};

test("adds a selected quantity within both stock and the 1–5 limit", () => {
  const cart = addItem(createEmptyCart(), product, 3);

  assert.equal(cart.items.length, 1);
  assert.equal(cart.items[0]?.quantity, 3);
  assert.equal("stock" in (cart.items[0] ?? {}), false);
});

test("repeat add is a no-op and does not change the existing quantity", () => {
  const once = addItem(createEmptyCart(), product, 2);
  const twice = addItem(once, { ...product, unitPriceSnapshot: 1700 }, 1);

  assert.equal(twice, once);
  assert.equal(twice.items[0]?.quantity, 2);
  assert.equal(twice.items[0]?.unitPriceSnapshot, 1600);
});

test("rejects unavailable, excessive, fractional and zero quantities", () => {
  for (const [candidate, stock] of [
    [0, 3],
    [4, 3],
    [6, 10],
    [1.5, 3],
    [1, 0],
  ] as const) {
    assert.throws(
      () => addItem(createEmptyCart(), { ...product, stock }, candidate),
      RangeError,
    );
  }
});

test("allows only downward corrections when stored quantity exceeds current stock", () => {
  const cart = addItem(createEmptyCart(), { ...product, stock: 5 }, 5);

  const firstCorrection = updateItemQuantity(cart, product.productId, 4, 2);
  assert.equal(firstCorrection.items[0]?.quantity, 4);
  assert.throws(
    () => updateItemQuantity(firstCorrection, product.productId, 5, 2),
    RangeError,
  );

  const corrected = updateItemQuantity(
    firstCorrection,
    product.productId,
    2,
    2,
  );
  assert.equal(corrected.items[0]?.quantity, 2);
});

test("removes one item or clears the complete cart", () => {
  const first = addItem(createEmptyCart(), product, 1);
  const second = addItem(
    first,
    { ...product, productId: "product-2", slug: "gyokuro" },
    1,
  );

  assert.deepEqual(
    removeItem(second, product.productId).items.map((item) => item.productId),
    ["product-2"],
  );
  assert.deepEqual(clearCart(second), createEmptyCart());
});
