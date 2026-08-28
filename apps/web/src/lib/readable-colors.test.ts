import assert from "node:assert/strict";
import test from "node:test";

import { contrastRatio, hasReadableContrast } from "./readable-colors.ts";

test("measures WCAG contrast between storefront ink and paper", () => {
  const ratio = contrastRatio("#1e2329", "#f5f7fa");
  assert.ok(ratio && ratio > 12);
  assert.equal(hasReadableContrast("#1e2329", "#f5f7fa"), true);
  assert.equal(hasReadableContrast("#24251e", "#efede4"), true);
});

test("rejects matching about colors that disappear into the surface", () => {
  assert.equal(hasReadableContrast("#f5efef", "#f5efef"), false);
  assert.equal(hasReadableContrast("  #F5EFEF  ", "#f5efef"), false);
});
