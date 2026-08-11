import assert from "node:assert/strict";
import test from "node:test";

import { CmsValidationError } from "./errors.ts";
import { mapProductDetailPayload } from "./product-detail-mapper.ts";

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
  story: "Чай для долгого тихого вечера.",
  mainImage: {
    alt: "Пачка Да Хун Пао",
    image: {
      url: "/storefront/main.png",
      width: 1200,
      height: 1500,
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
    story: "Чай для долгого тихого вечера.",
    articles: [],
    images: [
      {
        url: "http://localhost:9000/storefront/large-main.png",
        thumbnailUrl: "http://localhost:9000/storefront/thumbnail-main.png",
        sources: [
          {
            url: "http://localhost:9000/storefront/thumbnail-main.png",
            width: 125,
          },
          {
            url: "http://localhost:9000/storefront/large-main.png",
            width: 800,
          },
          {
            url: "http://localhost:9000/storefront/main.png",
            width: 1200,
          },
        ],
        alt: "Пачка Да Хун Пао",
        width: 800,
        height: 1000,
      },
      {
        url: "http://localhost:9000/storefront/leaves.png",
        thumbnailUrl: "http://localhost:9000/storefront/leaves.png",
        sources: [
          {
            url: "http://localhost:9000/storefront/leaves.png",
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

test("maps entity-specific SEO fields from the CMS", () => {
  const product = mapProductDetailPayload(
    {
      data: [
        {
          ...productRecord,
          seo: {
            title: "Да Хун Пао — сорт чая Brega Chai",
            description: "Отдельное описание сорта.",
            image: { url: "/storefront/seo.png" },
          },
        },
      ],
    },
    "http://localhost:9000",
  );

  assert.deepEqual(product?.seo, {
    title: "Да Хун Пао — сорт чая Brega Chai",
    description: "Отдельное описание сорта.",
    imageUrl: "http://localhost:9000/storefront/seo.png",
  });
});

test("returns null when the filtered product does not exist", () => {
  assert.equal(
    mapProductDetailPayload({ data: [] }, "http://localhost:9000"),
    null,
  );
});

test("rejects gallery media without a usage-specific alt", () => {
  assert.throws(
    () =>
      mapProductDetailPayload(
        {
          data: [
            {
              ...productRecord,
              gallery: [
                {
                  alt: "",
                  image: {
                    url: "/storefront/leaves.png",
                    width: 1200,
                    height: 1200,
                  },
                },
              ],
            },
          ],
        },
        "http://localhost:9000",
      ),
    CmsValidationError,
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
