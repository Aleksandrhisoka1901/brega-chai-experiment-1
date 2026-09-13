import assert from "node:assert/strict";
import test from "node:test";

import { inquirySchema } from "./validation.ts";

test("requires name, phone, email and privacy consent", () => {
  const invalid = inquirySchema.safeParse({
    name: "",
    phone: "",
    email: "",
    comment: "",
    modelInterest: "",
    privacyConsent: false,
  });
  assert.equal(invalid.success, false);

  const valid = inquirySchema.safeParse({
    name: "Анна",
    phone: "+7 (999) 123-45-67",
    email: "anna@example.com",
    comment: "Нужна система на объект",
    modelInterest: "FP115KWH",
    privacyConsent: true,
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.phone, "+79991234567");
    assert.equal(valid.data.email, "anna@example.com");
    assert.equal(valid.data.modelInterest, "FP115KWH");
  }

  const withoutEmail = inquirySchema.safeParse({
    name: "Анна",
    phone: "+7 (999) 123-45-67",
    email: "",
    comment: "",
    modelInterest: "",
    privacyConsent: true,
  });
  assert.equal(withoutEmail.success, false);
});
