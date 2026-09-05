import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSlugImmutable,
  generateUniqueSlug,
  isValidAsciiSlug,
  normalizeSlugBase,
  shouldRegenerateDraftSlug,
  shouldGenerateSlug,
  transliterateCatalogTitle,
} from "../src/api/product/content-types/product/slug.ts";

const transliterateFixture = (value: string) =>
  value === "Да Хун Пао" ? "Da Khun Pao" : value;

test("normalizes a transliterated title without a random suffix", () => {
  assert.equal(
    normalizeSlugBase(transliterateFixture("Да Хун Пао")),
    "da-khun-pao",
  );
});

test("uses the agreed URL transliteration for Cyrillic titles", () => {
  assert.equal(transliterateCatalogTitle("Да Хун Пао"), "Da Khun Pao");
});

test("uses a stable fallback for titles without latin characters", () => {
  assert.equal(normalizeSlugBase("茶"), "item");
});

test("builds an ascii slug from a long Russian article title", async () => {
  const slug = await generateUniqueSlug({
    title:
      "Резервное питание дома при отключении электричества: какую портативную электростанцию выбрать для квартиры и дачи",
    transliterate: transliterateCatalogTitle,
    exists: async () => false,
  });

  assert.equal(
    slug,
    "rezervnoe-pitanie-doma-pri-otklyuchenii-elektrichestva-kakuyu-portativnuyu-elektrostanciyu-vybrat-dlya-kvartiry-i-dachi",
  );
  assert.equal(isValidAsciiSlug(slug), true);
});

test("adds deterministic numeric suffixes when a generated slug collides", async () => {
  const checked: string[] = [];
  const slug = await generateUniqueSlug({
    title: "Да Хун Пао",
    transliterate: transliterateFixture,
    exists: async (candidate) => {
      checked.push(candidate);
      return candidate === "da-khun-pao" || candidate === "da-khun-pao-2";
    },
  });

  assert.equal(slug, "da-khun-pao-3");
  assert.deepEqual(checked, ["da-khun-pao", "da-khun-pao-2", "da-khun-pao-3"]);
});

test("rejects a changed slug but permits an omitted or unchanged value", () => {
  assert.doesNotThrow(() => assertSlugImmutable("tea-a1b2c3", undefined));
  assert.doesNotThrow(() => assertSlugImmutable("tea-a1b2c3", "tea-a1b2c3"));
  assert.throws(
    () => assertSlugImmutable("tea-a1b2c3", "other-d4e5f6"),
    /cannot be changed/,
  );
});

test("generates a slug when create data omits one or carries a non-ascii value", () => {
  assert.equal(shouldGenerateSlug(undefined), true);
  assert.equal(shouldGenerateSlug(""), true);
  assert.equal(shouldGenerateSlug("product"), false);
  assert.equal(shouldGenerateSlug("tea-a1b2c3"), false);
  assert.equal(
    shouldGenerateSlug("rezervnoe-pitanie-doma-pri-otklyuchenii-elektrychества"),
    true,
  );
  assert.equal(isValidAsciiSlug("rezervnoe-pitanie-doma-pri-otklyuchenii-elektrichestva"), true);
  assert.equal(
    isValidAsciiSlug("rezervnoe-pitanie-doma-pri-otklyuchenii-elektrychества"),
    false,
  );
});

test("regenerates from a changed draft display name before first publish", () => {
  assert.equal(
    shouldRegenerateDraftSlug({
      currentDisplayName: "Утро без слов",
      nextDisplayName: "Тихое утро",
      hasPublishedVersion: false,
    }),
    true,
  );
  assert.equal(
    shouldRegenerateDraftSlug({
      currentDisplayName: "Утро без слов",
      nextDisplayName: "Утро без слов",
      hasPublishedVersion: false,
    }),
    false,
  );
});

test("never follows display-name changes after the document was published", () => {
  assert.equal(
    shouldRegenerateDraftSlug({
      currentDisplayName: "Утро без слов",
      nextDisplayName: "Тихое утро",
      hasPublishedVersion: true,
    }),
    false,
  );
});
