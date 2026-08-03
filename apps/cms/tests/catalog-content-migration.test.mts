import assert from "node:assert/strict";
import { test } from "node:test";

import {
  blocksToPlainText,
  buildCatalogRecords,
  CATALOG_STORAGE,
  extractAboutFields,
  migratePublicUrl,
  productDisplayName,
  technicalProductTitle,
} from "../database/catalog-content-helpers.js";

test("catalog migration preserves Blocks text when simplifying the products page", () => {
  assert.equal(
    blocksToPlainText([
      {
        type: "paragraph",
        children: [
          { type: "text", text: "Первый " },
          { type: "text", text: "абзац" },
        ],
      },
      {
        type: "list",
        children: [
          {
            type: "list-item",
            children: [{ type: "text", text: "Второй абзац" }],
          },
        ],
      },
    ]),
    "Первый абзац\n\nВторой абзац",
  );
  assert.equal(blocksToPlainText(" Уже простой текст. "), "Уже простой текст.");
  assert.equal(
    blocksToPlainText(
      '[{"type":"paragraph","children":[{"type":"text","text":"JSON-текст"}]}]',
    ),
    "JSON-текст",
  );
});

test("catalog migration matches the relation storage used by the real Strapi database", () => {
  assert.deepEqual(CATALOG_STORAGE, {
    homePageComponentIdColumn: "cmp_id",
    featuredNabory: {
      legacy: "home_pages_featured_rituals_lnk",
      current: "home_pages_featured_nabory_lnk",
    },
    featuredTovary: {
      legacy: "home_pages_featured_products_lnk",
      current: "home_pages_featured_tovary_lnk",
    },
  });
});

test("catalog migration transliterates document slugs and resolves collisions numerically", () => {
  const records = buildCatalogRecords(
    [
      { id: 1, document_id: "doc-1", title: "Да Хун Пао", type: "product" },
      { id: 2, document_id: "doc-1", title: "Да Хун Пао", type: "product" },
      { id: 3, document_id: "doc-2", title: "Да Хун Пао", type: "ritual" },
      { id: 4, document_id: "doc-3", title: "Шу Пуэр", type: "tovar" },
    ],
    (value) =>
      ({ "Да Хун Пао": "Da Khun Pao", "Шу Пуэр": "Shu Puer" })[value] ?? value,
  );

  assert.deepEqual(records, [
    {
      ids: [1, 2],
      slug: "da-khun-pao",
      type: "tovar",
      categoryLabel: "сорт чая",
    },
    {
      ids: [3],
      slug: "da-khun-pao-2",
      type: "nabor",
      categoryLabel: "чайный ритуал",
    },
    {
      ids: [4],
      slug: "shu-puer",
      type: "tovar",
      categoryLabel: "сорт чая",
    },
  ]);
});

test("catalog migration turns the legacy about blocks into one title and two text fields", () => {
  const blocks = [
    {
      type: "paragraph",
      children: [{ type: "text", text: " Заголовок " }],
    },
    {
      type: "paragraph",
      children: [
        { type: "text", text: "Первый " },
        { type: "text", text: "абзац" },
      ],
    },
    {
      type: "paragraph",
      children: [{ type: "text", text: "Второй абзац" }],
    },
  ];

  assert.deepEqual(extractAboutFields(blocks), {
    title: "Заголовок",
    textBlock1: "Первый абзац",
    textBlock2: "Второй абзац",
  });
});

test("catalog migration helpers are idempotent for already migrated records", () => {
  const records = buildCatalogRecords(
    [
      {
        id: 1,
        document_id: "doc-1",
        title: "Да Хун Пао",
        type: "tovar",
        category_label: "сорт чая",
      },
    ],
    () => "Da Khun Pao",
  );

  assert.deepEqual(records[0], {
    ids: [1],
    slug: "da-khun-pao",
    type: "tovar",
    categoryLabel: "сорт чая",
  });
});

test("catalog migration transliterates legacy internal CMS links", () => {
  assert.equal(migratePublicUrl("#rituals"), "#nabory");
  assert.equal(migratePublicUrl("/#products"), "/#tovary");
  assert.equal(migratePublicUrl("/products/tea"), "/tovary/tea");
  assert.equal(migratePublicUrl("https://example.com/products"), null);
  assert.equal(migratePublicUrl("/#nabory"), null);
});

test("catalog migration separates technical and storefront product names", () => {
  assert.equal(productDisplayName("Да Хун Пао"), "Да Хун Пао");
  assert.equal(productDisplayName("Сорт: Да Хун Пао"), "Да Хун Пао");
  assert.equal(
    technicalProductTitle("Да Хун Пао", "tovar"),
    "Сорт: Да Хун Пао",
  );
  assert.equal(
    technicalProductTitle("Утро без слов", "nabor"),
    "Ритуал: Утро без слов",
  );
});
