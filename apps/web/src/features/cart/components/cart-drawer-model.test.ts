import assert from "node:assert/strict";
import test from "node:test";

import {
  getCartItemAvailability,
  getQuantityControlState,
} from "./cart-drawer-model.ts";
import type { CartItem } from "../types.ts";

const item: CartItem = {
  productId: "product-1",
  slug: "tea-a1b2c3",
  type: "tovar",
  title: "Да Хун Пао",
  packageLabel: "50 г",
  unitPriceSnapshot: 1600,
  currency: "RUB",
  image: { url: "/tea.png", alt: "Чай Да Хун Пао" },
  quantity: 3,
};

test("distinguishes unknown, available, insufficient and unavailable stock", () => {
  assert.equal(getCartItemAvailability(item), "unknown");
  assert.equal(getCartItemAvailability(item, 4), "available");
  assert.equal(getCartItemAvailability(item, 2), "insufficient");
  assert.equal(getCartItemAvailability(item, 0), "unavailable");
});

test("quantity controls respect one, five and current stock", () => {
  assert.deepEqual(getQuantityControlState({ ...item, quantity: 1 }, 4), {
    canDecrease: false,
    canIncrease: true,
    maximum: 4,
  });
  assert.deepEqual(getQuantityControlState({ ...item, quantity: 4 }, 4), {
    canDecrease: true,
    canIncrease: false,
    maximum: 4,
  });
  assert.deepEqual(getQuantityControlState({ ...item, quantity: 5 }), {
    canDecrease: true,
    canIncrease: false,
    maximum: 5,
  });
});
