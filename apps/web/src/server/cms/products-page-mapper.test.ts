import assert from "node:assert/strict";
import test from "node:test";

import type { ProductSummary } from "@brega-chai/contracts";

import { CmsValidationError } from "./errors.ts";
import {
  mapProductsPageLoadResults,
  mapProductsPagePayload,
} from "./products-page-mapper.ts";

const paragraph = (text: string) => ({
  type: "paragraph",
  children: [{ type: "text", text }],
});

const validPayload = {
  data: {
    title: "Чай, выбранный для внимания",
    intro: [paragraph("Небольшая коллекция без спешки.")],
    image: {
      alt: "Чайные листья на светлом столе",
      image: {
        url: "/storefront/catalog.jpg",
        width: 1600,
        height: 1000,
      },
    },
    seo: {
      title: "Купить китайский чай",
      description: "Коллекция китайского чая Brega Chai.",
    },
  },
};

test("maps the published products-page intro, image, and SEO", () => {
  assert.deepEqual(
    mapProductsPagePayload(validPayload, "http://localhost:9000"),
    {
      title: "Чай, выбранный для внимания",
      intro: [
        {
          type: "paragraph",
          children: [{ type: "text", text: "Небольшая коллекция без спешки." }],
        },
      ],
      image: {
        url: "http://localhost:9000/storefront/catalog.jpg",
        alt: "Чайные листья на светлом столе",
        width: 1600,
        height: 1000,
      },
      seo: {
        title: "Купить китайский чай",
        description: "Коллекция китайского чая Brega Chai.",
      },
    },
  );
});

test("accepts short and long editorial announcements without arbitrary limits", () => {
  const longAnnouncement = "Чай ".repeat(200).trim();

  for (const text of ["Тихо.", longAnnouncement]) {
    const content = mapProductsPagePayload(
      {
        ...validPayload,
        data: { ...validPayload.data, intro: [paragraph(text)] },
      },
      "http://localhost:9000",
    );

    assert.deepEqual(content.intro[0], {
      type: "paragraph",
      children: [{ type: "text", text }],
    });
  }
});

test("allows the optional catalog image to be absent", () => {
  const content = mapProductsPagePayload(
    {
      ...validPayload,
      data: { ...validPayload.data, image: null },
    },
    "http://localhost:9000",
  );

  assert.equal(content.image, undefined);
});

test("rejects malformed Blocks and incomplete optional images", () => {
  for (const data of [
    { ...validPayload.data, intro: [{ type: "quote", children: [] }] },
    {
      ...validPayload.data,
      image: {
        alt: "",
        image: { url: "/catalog.jpg", width: 1200, height: 800 },
      },
    },
  ]) {
    assert.throws(
      () =>
        mapProductsPagePayload(
          { ...validPayload, data },
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
