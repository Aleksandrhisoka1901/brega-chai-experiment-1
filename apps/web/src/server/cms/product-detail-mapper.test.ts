import assert from "node:assert/strict";
import test from "node:test";

import { CmsValidationError } from "./errors.ts";
import { mapProductDetailPayload } from "./product-detail-mapper.ts";

const mediaUpdatedAt = "2026-08-16T12:34:56.000Z";
const mediaVersion = "?v=2026-08-16T12%3A34%3A56.000Z";

const productRecord = {
  documentId: "product-1",
  slug: "da-hong-pao",
  type: "tovar",
  title: "Сорт: Да Хун Пао",
  displayName: "Да Хун Пао",
  breadcrumbLabel: "Да Хун Пао, 50 г",
  categoryLabel: "улун",
  originalTitle: "Большой красный халат",
  packageLabel: "50 г",
  price: 1600,
  currency: "RUB",
  stock: 3,
  cardExcerpt: "Минеральный утёсный улун.",
  story: [
    {
      type: "heading",
      level: 1,
      children: [{ type: "text", text: "Тихий вечер" }],
    },
    {
      type: "paragraph",
      children: [
        { type: "text", text: "Чай для ", italic: true },
        {
          type: "link",
          url: "javascript:alert(1)",
          children: [{ type: "text", text: "долгого вечера" }],
        },
      ],
    },
  ],
  mainImage: {
    alt: "Пачка Да Хун Пао",
    image: {
      url: "/storefront/main.png",
      width: 1200,
      height: 1500,
      updatedAt: mediaUpdatedAt,
      formats: {
        large: {
          url: "/storefront/large-main.png",
          width: 800,
          height: 1000,
        },
        thumbnail: {
          url: "/storefront/thumbnail-main.png",
          width: 125,
          height: 156,
        },
      },
    },
  },
  gallery: [
    {
      alt: "Сухой чайный лист",
      image: {
        url: "/storefront/leaves.png",
        width: 1200,
        height: 1200,
        updatedAt: mediaUpdatedAt,
      },
    },
  ],
};

test("maps the product detail and keeps main image before gallery images", () => {
  const product = mapProductDetailPayload(
    { data: [productRecord] },
    "http://localhost:9000",
  );

  assert.deepEqual(product, {
    id: "product-1",
    slug: "da-hong-pao",
    type: "tovar",
    title: "Да Хун Пао",
    breadcrumbLabel: "Да Хун Пао, 50 г",
    categoryLabel: "улун",
    originalTitle: "Большой красный халат",
    packageLabel: "50 г",
    priceRubles: 1600,
    currency: "RUB",
    stock: 3,
    inStock: true,
    excerpt: "Минеральный утёсный улун.",
    story: [
      {
        type: "heading",
        level: 2,
        children: [{ type: "text", text: "Тихий вечер" }],
      },
      {
        type: "paragraph",
        children: [
          { type: "text", text: "Чай для ", italic: true },
          { type: "text", text: "долгого вечера" },
        ],
      },
    ],
    articles: [],
    images: [
      {
        url: `http://localhost:9000/storefront/main.png${mediaVersion}`,
        thumbnailUrl: `http://localhost:9000/storefront/thumbnail-main.png${mediaVersion}`,
        sources: [
          {
            url: `http://localhost:9000/storefront/thumbnail-main.png${mediaVersion}`,
            width: 125,
          },
          {
            url: `http://localhost:9000/storefront/large-main.png${mediaVersion}`,
            width: 800,
          },
          {
            url: `http://localhost:9000/storefront/main.png${mediaVersion}`,
            width: 1200,
          },
        ],
        alt: "Пачка Да Хун Пао",
        width: 1200,
        height: 1500,
      },
      {
        url: `http://localhost:9000/storefront/leaves.png${mediaVersion}`,
        thumbnailUrl: `http://localhost:9000/storefront/leaves.png${mediaVersion}`,
        sources: [
          {
            url: `http://localhost:9000/storefront/leaves.png${mediaVersion}`,
            width: 1200,
          },
        ],
        alt: "Сухой чайный лист",
        width: 1200,
        height: 1200,
      },
    ],
  });
});

test("uses display name and generic type labels when optional entity labels are empty", () => {
  const product = mapProductDetailPayload(
    {
      data: [
        {
          ...productRecord,
          type: "nabor",
          breadcrumbLabel: " ",
          categoryLabel: null,
        },
      ],
    },
    "http://localhost:9000",
  );

  assert.equal(product?.breadcrumbLabel, "Да Хун Пао");
  assert.equal(product?.categoryLabel, "набор");
});

test("maps zero stock as unavailable and allows a controlled empty gallery", () => {
  const product = mapProductDetailPayload(
    {
      data: [
        {
          ...productRecord,
          stock: 0,
          mainImage: null,
          gallery: [],
        },
      ],
    },
    "http://localhost:9000",
  );

  assert.equal(product?.inStock, false);
  assert.equal(product?.stock, 0);
  assert.deepEqual(product?.images, []);
});

test("maps the required main image as the only displayed image when gallery is empty", () => {
  const product = mapProductDetailPayload(
    { data: [{ ...productRecord, gallery: [] }] },
    "http://localhost:9000",
  );

  assert.equal(product?.images.length, 1);
  assert.equal(
    product?.images[0]?.url,
    `http://localhost:9000/storefront/main.png${mediaVersion}`,
  );
  assert.equal(
    product?.images[0]?.thumbnailUrl,
    `http://localhost:9000/storefront/thumbnail-main.png${mediaVersion}`,
  );
});

test("maps entity-specific SEO fields from the CMS", () => {
  const product = mapProductDetailPayload(
    {
      data: [
        {
          ...productRecord,
          seo: {
            title: "Да Хун Пао — сорт чая Brega Chai",
            description: "Отдельное описание сорта.",
            image: { url: "/storefront/seo.png", updatedAt: mediaUpdatedAt },
          },
        },
      ],
    },
    "http://localhost:9000",
  );

  assert.deepEqual(product?.seo, {
    title: "Да Хун Пао — сорт чая Brega Chai",
    description: "Отдельное описание сорта.",
    imageUrl: `http://localhost:9000/storefront/seo.png${mediaVersion}`,
  });
});

test("returns null when the filtered product does not exist", () => {
  assert.equal(
    mapProductDetailPayload({ data: [] }, "http://localhost:9000"),
    null,
  );
});

test("maps empty and missing product image alt text to an empty string", () => {
  const product = mapProductDetailPayload(
    {
      data: [
        {
          ...productRecord,
          mainImage: { ...productRecord.mainImage, alt: "" },
          gallery: [
            {
              image: {
                url: "/storefront/leaves.png",
                width: 1200,
                height: 1200,
                updatedAt: mediaUpdatedAt,
              },
            },
          ],
        },
      ],
    },
    "http://localhost:9000",
  );

  assert.deepEqual(
    product?.images.map((image) => image.alt),
    ["", ""],
  );
});

test("normalizes ordered product articles at the CMS boundary", () => {
  const product = mapProductDetailPayload(
    {
      data: [
        {
          ...productRecord,
          articles: [
            {
              content: [
                {
                  type: "heading",
                  level: 1,
                  children: [{ type: "text", text: "Как заваривать" }],
                },
              ],
            },
            {
              content: [
                {
                  type: "paragraph",
                  children: [
                    {
                      type: "link",
                      url: "javascript:alert(1)",
                      children: [{ type: "text", text: "Безопасный текст" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    "http://localhost:9000",
  );

  assert.deepEqual(product?.articles, [
    [
      {
        type: "heading",
        level: 2,
        children: [{ type: "text", text: "Как заваривать" }],
      },
    ],
    [
      {
        type: "paragraph",
        children: [{ type: "text", text: "Безопасный текст" }],
      },
    ],
  ]);
});

test("rejects a non-array article content payload", () => {
  assert.throws(
    () =>
      mapProductDetailPayload(
        {
          data: [
            {
              ...productRecord,
              articles: [{ content: "<script>alert(1)</script>" }],
            },
          ],
        },
        "http://localhost:9000",
      ),
    CmsValidationError,
  );
});

test("treats invalid product story content as empty rich content", () => {
  const product = mapProductDetailPayload(
    { data: [{ ...productRecord, story: "<script>alert(1)</script>" }] },
    "http://localhost:9000",
  );

  assert.deepEqual(product?.story, []);
});
