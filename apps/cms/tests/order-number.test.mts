import assert from "node:assert/strict";
import test from "node:test";

import {
  createOrderNumber,
  getNextOrderNumberSequence,
} from "../src/api/order/services/order-number.ts";

test("creates a monthly sequential Moscow order number", () => {
  assert.equal(
    createOrderNumber(new Date("2026-07-30T15:42:00.000Z"), 1),
    "2607-0001",
  );
  assert.equal(getNextOrderNumberSequence("2607-0042", "2607"), 43);
  assert.equal(getNextOrderNumberSequence(undefined, "2607"), 1);
  assert.match(createOrderNumber(new Date(), 9_999), /^\d{4}-\d{4}$/);
  assert.throws(() => createOrderNumber(new Date(), 10_000), RangeError);
});
