import assert from "node:assert/strict";
import test from "node:test";

import {
  getInitialProductQuantity,
  getMaximumProductQuantity,
  resolveProductQuantityChange,
  updateProductQuantity,
} from "./product-detail-model.ts";

test("quantity starts at one and cannot exceed stock below five", () => {
  const maximum = getMaximumProductQuantity(3);

  assert.equal(maximum, 3);
  assert.equal(getInitialProductQuantity(3), 1);
  assert.equal(updateProductQuantity(3, 1, maximum), 3);
});

test("quantity is capped at the configured limit when stock is higher", () => {
  const maximum = getMaximumProductQuantity(12, 8);

  assert.equal(maximum, 8);
  assert.equal(updateProductQuantity(8, 1, maximum), 8);
});

test("quantity cannot fall below one for an available product", () => {
  assert.equal(updateProductQuantity(1, -1, 5), 1);
});

test("an unavailable product has no selectable quantity", () => {
  assert.equal(getMaximumProductQuantity(0), 0);
  assert.equal(getInitialProductQuantity(0), 0);
  assert.equal(updateProductQuantity(0, 1, 0), 0);
});

test("quantity changes target the cart and start from its current value after add", () => {
  assert.deepEqual(
    resolveProductQuantityChange({
      cartQuantity: 3,
      selectedQuantity: 1,
      delta: 1,
      maximum: 5,
    }),
    { quantity: 4, target: "cart" },
  );
  assert.deepEqual(
    resolveProductQuantityChange({
      selectedQuantity: 2,
      delta: -1,
      maximum: 5,
    }),
    { quantity: 1, target: "selection" },
  );
});
