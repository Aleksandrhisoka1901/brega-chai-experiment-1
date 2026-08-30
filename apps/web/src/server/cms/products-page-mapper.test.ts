import assert from "node:assert/strict";
import test from "node:test";

import type { ProductSummary } from "@brega-chai/contracts";

import { CmsValidationError } from "./errors.ts";
import {
  mapProductsPageLoadResults,
  mapProductsPagePayload,
} from "./products-page-mapper.ts";

const validPayload = {
  data: {
    eyebrow: "Глава 03",
    title: "Чай, выбранный для внимания",
    emptyStateText: "Сорта скоро появятся.",
    emptyStateLinkLabel: "Вернуться на главную",
    intro: "Небольшая коллекция без спешки.",
    seo: {
      title: "Купить китайский чай",
      description: "Коллекция китайского чая Brega Chai.",
    },
  },
};

test("maps a chapter products-page eyebrow without showing the number", () => {
  const content = mapProductsPagePayload(validPayload, "http://localhost:9000");

  assert.equal(content.eyebrow, undefined);
  assert.equal(Object.hasOwn(content, "eyebrow"), false);
  assert.deepEqual(content, {
    title: "Чай, выбранный для внимания",
    emptyStateText: "Сорта скоро появятся.",
    emptyStateLinkLabel: "Вернуться на главную",
    intro: "Небольшая коллекция без спешки.",
    seo: {
      title: "Купить китайский чай",
      description: "Коллекция китайского чая Brega Chai.",
    },
  });
});

test("maps an absent or blank products-page eyebrow without a placeholder", () => {
  for (const eyebrow of [undefined, null, "", "   "]) {
    const content = mapProductsPagePayload(
      {
        ...validPayload,
        data: { ...validPayload.data, eyebrow },
      },
      "http://localhost:9000",
    );

    assert.equal(content.eyebrow, undefined);
    assert.equal(Object.hasOwn(content, "eyebrow"), false);
  }
});

test("accepts short and long editorial announcements without arbitrary limits", () => {
  const longAnnouncement = "Чай ".repeat(200).trim();

  for (const text of ["Тихо.", longAnnouncement]) {
    const content = mapProductsPagePayload(
      {
        ...validPayload,
        data: { ...validPayload.data, intro: text },
      },
      "http://localhost:9000",
    );

    assert.equal(content.intro, text);
  }
});

test("allows optional page SEO to be absent", () => {
  const content = mapProductsPagePayload(
    {
      ...validPayload,
      data: { ...validPayload.data, seo: null },
    },
    "http://localhost:9000",
  );

  assert.equal(content.seo, undefined);
});

test("rejects an empty or non-text intro", () => {
  for (const intro of ["", [{ type: "paragraph", children: [] }]]) {
    assert.throws(
      () =>
        mapProductsPagePayload(
          {
            ...validPayload,
            data: { ...validPayload.data, intro },
          },
          "http://localhost:9000",
        ),
      CmsValidationError,
    );
  }
});

test("builds independent intro and catalog availability into the page model", () => {
  const content = mapProductsPagePayload(validPayload, "http://localhost:9000");
  const products = [{ id: "tea-1", title: "Да Хун Пао" }] as ProductSummary[];

  assert.deepEqual(
    mapProductsPageLoadResults(
      { status: "rejected", reason: new Error("offline") },
      { status: "fulfilled", value: products },
    ),
    {
      content: null,
      products,
      contentUnavailable: true,
      productsUnavailable: false,
    },
  );
  assert.deepEqual(
    mapProductsPageLoadResults(
      { status: "fulfilled", value: content },
      { status: "rejected", reason: new Error("offline") },
    ),
    {
      content,
      products: [],
      contentUnavailable: false,
      productsUnavailable: true,
    },
  );
});
