import assert from "node:assert/strict";
import test from "node:test";

import { CmsValidationError } from "./errors.ts";
import { mapProductDetailPayload } from "./product-detail-mapper.ts";

const productRecord = {
  documentId: "product-1",
  slug: "da-hong-pao-a1b2c3",
  type: "product",
  title: "Да Хун Пао",
  originalTitle: "大红袍",
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
    slug: "da-hong-pao-a1b2c3",
    type: "product",
    title: "Да Хун Пао",
    originalTitle: "大红袍",
    packageLabel: "50 г",
    priceRubles: 1600,
    currency: "RUB",
    stock: 3,
    inStock: true,
    excerpt: "Минеральный утёсный улун.",
    story: "Чай для долгого тихого вечера.",
    images: [
      {
        url: "http://localhost:9000/storefront/main.png",
        alt: "Пачка Да Хун Пао",
        width: 1200,
        height: 1500,
      },
      {
        url: "http://localhost:9000/storefront/leaves.png",
        alt: "Сухой чайный лист",
        width: 1200,
        height: 1200,
      },
    ],
  });
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
