import assert from "node:assert/strict";
import test from "node:test";

import {
  getRussianPhoneDigits,
  prepareRussianPhoneInput,
  toRussianPhoneValue,
} from "./phone-mask.ts";

test("normalizes typed and pasted Russian phone numbers", () => {
  assert.equal(getRussianPhoneDigits("8 (999) 123-45-67"), "9991234567");
  assert.equal(toRussianPhoneValue("+7 (999) 123-45-67"), "+79991234567");
  assert.equal(prepareRussianPhoneInput("7", ""), "");
  assert.equal(prepareRussianPhoneInput("8", ""), "");
  assert.equal(prepareRussianPhoneInput("9", ""), "9");
  assert.equal(prepareRussianPhoneInput("89991234567", ""), "9991234567");
});
