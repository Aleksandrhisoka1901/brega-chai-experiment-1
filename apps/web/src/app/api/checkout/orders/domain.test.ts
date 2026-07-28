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
    honeypot: "",
    unexpected: "value",
    order: {},
  });
  assert.equal(result.success, false);
});
