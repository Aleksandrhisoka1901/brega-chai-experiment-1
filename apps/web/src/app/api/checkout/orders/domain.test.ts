import assert from "node:assert/strict";
import test from "node:test";

import {
  createFormToken,
  parseBrowserOrderRequest,
  verifyFormToken,
} from "./domain.ts";

const secret = "test-secret-with-enough-entropy";

test("server-signed form token enforces minimum and maximum age", () => {
  const token = createFormToken({ secret, now: 10_000, nonce: "fixed" });

  assert.equal(
    verifyFormToken(token, { secret, now: 11_499, minimumAgeMs: 1500 }).ok,
    false,
  );
  assert.equal(
    verifyFormToken(token, { secret, now: 11_500, minimumAgeMs: 1500 }).ok,
    true,
  );
  assert.equal(
    verifyFormToken(token, {
      secret,
      now: 10_000 + 7_200_001,
      minimumAgeMs: 1500,
    }).ok,
    false,
  );
});

test("rejects tampered tokens and strict payload extras", () => {
  const token = createFormToken({ secret, now: 10_000, nonce: "fixed" });
  assert.equal(verifyFormToken(`${token}x`, { secret, now: 12_000 }).ok, false);

  const result = parseBrowserOrderRequest({
    formToken: token,
    honeypot: false,
    unexpected: "value",
    order: {},
  });
  assert.equal(result.success, false);
});

test("accepts pickup without an address and requires one for courier", () => {
  const base = {
    formToken: "signed",
    honeypot: false,
    order: {
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
      customer: { name: "Анна", phone: "+79991234567" },
      consents: {
        personalData: { accepted: true, documentVersion: "2026-07-28" },
        salesAndDelivery: { accepted: true, documentVersion: "2026-07-28" },
      },
      items: [{ productId: "product-1", quantity: 1 }],
    },
  };

  assert.equal(
    parseBrowserOrderRequest({
      ...base,
      order: { ...base.order, deliveryMethod: "pickup" },
    }).success,
    true,
  );
  assert.equal(
    parseBrowserOrderRequest({
      ...base,
      order: { ...base.order, deliveryMethod: "courier" },
    }).success,
    false,
  );
});
