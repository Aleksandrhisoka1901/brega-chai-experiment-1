import assert from "node:assert/strict";
import test from "node:test";

import {
  checkoutSchema,
  normalizeRussianPhone,
  validateCheckout,
} from "./validation.ts";

const valid = {
  name: "Анна",
  phone: "+7 999 123-45-67",
  email: "",
  deliveryAddress: "Москва, ул. Чайная, д. 1, кв. 2",
  comment: "",
  privacyConsent: true,
  termsConsent: true,
};

test("normalizes pasted Russian phone to E.164", () => {
  assert.equal(normalizeRussianPhone("8 (999) 123-45-67"), "+79991234567");
});

test("validates required fields and both consents", () => {
  const result = validateCheckout({
    ...valid,
    name: "",
    deliveryAddress: "",
    privacyConsent: false,
    termsConsent: false,
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(Object.keys(result.errors), [
      "name",
      "deliveryAddress",
      "privacyConsent",
      "termsConsent",
    ]);
    assert.equal(result.firstInvalidField, "name");
  }
});

test("accepts empty optional values and returns normalized payload", () => {
  const parsed = checkoutSchema.parse(valid);

  assert.equal(parsed.phone, "+79991234567");
  assert.equal(parsed.email, undefined);
  assert.equal(parsed.comment, undefined);
});
