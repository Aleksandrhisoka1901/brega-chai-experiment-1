import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeEditorialEyebrow } from "./editorial-eyebrow.ts";

test("drops chapter numbers and keeps a remaining label", () => {
  assert.equal(sanitizeEditorialEyebrow("Глава 01 · О проекте"), "О проекте");
  assert.equal(sanitizeEditorialEyebrow("Глава 04"), undefined);
  assert.equal(sanitizeEditorialEyebrow("02"), undefined);
  assert.equal(sanitizeEditorialEyebrow("Энергия рядом. Всегда."), "Энергия рядом. Всегда.");
  assert.equal(sanitizeEditorialEyebrow("   "), undefined);
});
