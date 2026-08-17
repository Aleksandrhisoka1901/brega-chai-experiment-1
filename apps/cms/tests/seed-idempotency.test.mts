import assert from "node:assert/strict";
import test from "node:test";

import {
  alignBetterBlocksImages,
  assertSeedAllowed,
  planSeed,
  PUBLIC_STOREFRONT_ACTIONS,
  resolveSeedArticleImages,
} from "../scripts/seed-helpers.ts";
import { SHENG_PUER_PRODUCT } from "../scripts/seed-product-fixtures.ts";

test("first seed creates fixtures and the next seed updates the same documents", () => {
  const desired = [
    { key: "tea-one", title: "Tea one" },
    { key: "tea-two", title: "Tea two" },
  ];

  const firstRun = planSeed(desired, []);
  assert.deepEqual(
    firstRun.map((operation) => operation.type),
    ["create", "create"],
  );

  const secondRun = planSeed(desired, [
    { key: "tea-one", documentId: "doc-one", slug: "tea-one-a1b2c3" },
    { key: "tea-two", documentId: "doc-two", slug: "tea-two-d4e5f6" },
  ]);
  assert.deepEqual(
    secondRun.map((operation) => ({
      type: operation.type,
      documentId: operation.documentId,
      slug: operation.slug,
    })),
    [
      {
        type: "update",
        documentId: "doc-one",
        slug: "tea-one-a1b2c3",
      },
      {
        type: "update",
        documentId: "doc-two",
        slug: "tea-two-d4e5f6",
      },
    ],
  );
});

test("Sheng puer seed fixture provides the main image used by product cards", () => {
  assert.equal(SHENG_PUER_PRODUCT.key, "product-without-image");
  assert.equal(SHENG_PUER_PRODUCT.imageAsset, "gallery-gaiwan.png");
  assert.match(SHENG_PUER_PRODUCT.imageAlt, /\S/);
});

test("seed requires explicit opt-in and rejects production", () => {
  assert.throws(
    () =>
      assertSeedAllowed({
        NODE_ENV: "development",
        DATABASE_HOST: "postgres",
        DATABASE_NAME: "brega_chai",
      }),
    /SEED_ALLOWED=true/,
  );
  assert.throws(
    () =>
      assertSeedAllowed({
        SEED_ALLOWED: "true",
        NODE_ENV: "production",
        DATABASE_HOST: "postgres",
        DATABASE_NAME: "brega_chai",
      }),
    /NODE_ENV=production/,
  );
});

test("seed permits only known local database host and name combinations", () => {
  assert.doesNotThrow(() =>
    assertSeedAllowed({
      SEED_ALLOWED: "true",
      NODE_ENV: "development",
      DATABASE_HOST: "postgres",
      DATABASE_NAME: "brega_chai",
    }),
  );
  assert.doesNotThrow(() =>
    assertSeedAllowed({
      SEED_ALLOWED: "true",
      NODE_ENV: "test",
      DATABASE_HOST: "postgres",
      DATABASE_NAME: "brega_chai_test",
    }),
  );
  assert.throws(
    () =>
      assertSeedAllowed({
        SEED_ALLOWED: "true",
        NODE_ENV: "development",
        DATABASE_HOST: "production-db.example.com",
        DATABASE_NAME: "brega_chai",
      }),
    /database host/,
  );
  assert.throws(
    () =>
      assertSeedAllowed({
        SEED_ALLOWED: "true",
        NODE_ENV: "development",
        DATABASE_HOST: "postgres",
        DATABASE_NAME: "brega_chai_production",
      }),
    /database "brega_chai_production"/,
  );
});

test("seed exposes only read actions required by the storefront", () => {
  assert.deepEqual(PUBLIC_STOREFRONT_ACTIONS, [
    "api::global-setting.global-setting.find",
    "api::home-page.home-page.find",
    "api::product.product.find",
    "api::product.product.findOne",
    "api::products-page.products-page.find",
    "api::rituals-page.rituals-page.find",
  ]);
  assert.equal(
    PUBLIC_STOREFRONT_ACTIONS.some((action) => action.includes("order")),
    false,
  );
});

test("seed resolves existing media inside article Blocks", () => {
  assert.deepEqual(
    resolveSeedArticleImages(
      [
        { type: "paragraph", children: [{ type: "text", text: "До фото" }] },
        { type: "seed-image", asset: "gallery-gaiwan.png" },
        { type: "divider" },
      ],
      new Map([
        [
          "gallery-gaiwan.png",
          {
            id: 42,
            url: "/uploads/gallery-gaiwan.png",
            alternativeText: "Светлая гайвань",
            width: 1200,
            height: 1500,
          },
        ],
      ]),
    ),
    [
      { type: "paragraph", children: [{ type: "text", text: "До фото" }] },
      {
        type: "image",
        image: {
          id: 42,
          url: "/uploads/gallery-gaiwan.png",
          alternativeText: "Светлая гайвань",
          width: 1200,
          height: 1500,
        },
        children: [{ type: "text", text: "" }],
      },
      { type: "divider" },
    ],
  );

  assert.throws(
    () =>
      resolveSeedArticleImages(
        [{ type: "seed-image", asset: "missing.png" }],
        new Map(),
      ),
    /was not uploaded/,
  );
});

test("seed adds Better Blocks image alignment without changing text", () => {
  const paragraph = {
    type: "paragraph",
    children: [{ type: "text", text: "Текст" }],
  };
  const image = {
    type: "image",
    image: {
      id: 42,
      caption: "Подпись",
    },
    children: [{ type: "text", text: "" }],
  };

  assert.deepEqual(alignBetterBlocksImages([paragraph, image], "right"), [
    paragraph,
    {
      ...image,
      imageAlign: "right",
      caption: "Подпись",
    },
  ]);
});
