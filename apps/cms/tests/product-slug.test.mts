import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSlugImmutable,
  createSlugCandidate,
  generateUniqueSlug,
  normalizeSlugBase,
} from "../src/api/product/content-types/product/slug.ts";

const transliterateFixture = (value: string) =>
  value === "Да Хун Пао" ? "Da Khun Pao" : value;

test("normalizes a transliterated title and appends six hex characters", () => {
  assert.equal(
    createSlugCandidate("Да Хун Пао", transliterateFixture, "a1b2c3"),
    "da-khun-pao-a1b2c3",
  );
});

test("uses a stable fallback for titles without latin characters", () => {
  assert.equal(normalizeSlugBase("茶"), "product");
});

test("retries when a generated slug collides", async () => {
  const suffixes = ["a1b2c3", "d4e5f6"];
  const slug = await generateUniqueSlug({
    title: "Да Хун Пао",
    transliterate: transliterateFixture,
    suffix: () => suffixes.shift() ?? "000000",
    exists: async (candidate) => candidate.endsWith("a1b2c3"),
  });

  assert.equal(slug, "da-khun-pao-d4e5f6");
});

test("rejects a changed slug but permits an omitted or unchanged value", () => {
  assert.doesNotThrow(() => assertSlugImmutable("tea-a1b2c3", undefined));
  assert.doesNotThrow(() => assertSlugImmutable("tea-a1b2c3", "tea-a1b2c3"));
  assert.throws(
    () => assertSlugImmutable("tea-a1b2c3", "other-d4e5f6"),
    /cannot be changed/,
  );
});
