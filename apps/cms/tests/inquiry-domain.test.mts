import assert from "node:assert/strict";
import test from "node:test";

import {
  InquiryServiceError,
  parseInquiryInput,
  parseInquiryStatus,
} from "../src/api/inquiry/services/inquiry-domain.ts";

const valid = {
  customerName: "Анна",
  customerPhone: "+79991234567",
  customerEmail: "anna@example.com",
  source: "/tipovye-resheniya",
  privacyConsent: true as const,
};

test("accepts a storefront inquiry and rejects junk", () => {
  assert.deepEqual(parseInquiryInput(valid), valid);
  assert.equal(
    parseInquiryInput({
      ...valid,
      customerEmail: "anna@example.com",
      comment: "Нужна FP115KWH",
      modelInterest: "FP115KWH",
    }).modelInterest,
    "FP115KWH",
  );
  assert.throws(
    () => parseInquiryInput({ ...valid, customerEmail: "not-an-email" }),
    InquiryServiceError,
  );
  assert.throws(
    () => parseInquiryInput({ ...valid, customerEmail: undefined }),
    InquiryServiceError,
  );

  assert.throws(
    () => parseInquiryInput({ ...valid, privacyConsent: false }),
    InquiryServiceError,
  );
  assert.throws(
    () => parseInquiryInput({ ...valid, source: "https://evil.example" }),
    InquiryServiceError,
  );
  assert.throws(
    () => parseInquiryInput({ ...valid, customerPhone: "89991234567" }),
    InquiryServiceError,
  );
});

test("inquiry status accepts only new and processed", () => {
  assert.equal(parseInquiryStatus("processed"), "processed");
  assert.throws(() => parseInquiryStatus("confirmed"), InquiryServiceError);
});
