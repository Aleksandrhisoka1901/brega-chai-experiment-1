import assert from "node:assert/strict";
import test from "node:test";

import {
  checkoutSchema,
  normalizeRussianPhone,
  validateCheckout,
} from "./validation.ts";
import { checkoutFieldLimits } from "@brega-chai/contracts";

const valid = {
  deliveryMethod: "courier" as const,
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
      "privacyConsent",
      "termsConsent",
      "deliveryAddress",
    ]);
    assert.equal(result.firstInvalidField, "name");
  }
});

test("requires an explicit delivery method and only requires address for courier", () => {
  const missingMethod = validateCheckout({
    ...valid,
    deliveryMethod: undefined as never,
  });
  assert.equal(missingMethod.success, false);
  if (!missingMethod.success) {
    assert.equal(missingMethod.firstInvalidField, "deliveryMethod");
  }

  assert.equal(
    checkoutSchema.safeParse({
      ...valid,
      deliveryMethod: "pickup",
      deliveryAddress: "",
    }).success,
    true,
  );
  assert.equal(
    checkoutSchema.safeParse({ ...valid, deliveryAddress: "" }).success,
    false,
  );
});

test("accepts empty optional values and returns normalized payload", () => {
  const parsed = checkoutSchema.parse(valid);

  assert.equal(parsed.phone, "+79991234567");
  assert.equal(parsed.email, undefined);
  assert.equal(parsed.comment, undefined);
});

test("rejects checkout text fields above their limits", () => {
  const fields = [
    ["name", checkoutFieldLimits.name],
    ["phone", checkoutFieldLimits.phoneInput],
    ["email", checkoutFieldLimits.email],
    ["deliveryAddress", checkoutFieldLimits.deliveryAddress],
    ["comment", checkoutFieldLimits.comment],
  ] as const;

  for (const [field, limit] of fields) {
    const result = checkoutSchema.safeParse({
      ...valid,
      [field]: "x".repeat(limit + 1),
    });
    assert.equal(result.success, false, `${field} must reject overflow`);
  }
});
