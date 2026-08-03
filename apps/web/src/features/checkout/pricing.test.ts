import assert from "node:assert/strict";
import test from "node:test";

import { getCheckoutPricing } from "./pricing.ts";

test("does not recalculate or present a missing pickup discount", () => {
  assert.deepEqual(getCheckoutPricing(1600, "pickup", null), {
    discountPercent: 0,
    discountedTotal: 1600,
    hasDiscount: false,
  });
});

test("applies a configured pickup discount only to pickup", () => {
  assert.deepEqual(getCheckoutPricing(1600, "pickup", 10), {
    discountPercent: 10,
    discountedTotal: 1440,
    hasDiscount: true,
  });
  assert.deepEqual(getCheckoutPricing(1600, "courier", 10), {
    discountPercent: 0,
    discountedTotal: 1600,
    hasDiscount: false,
  });
});
