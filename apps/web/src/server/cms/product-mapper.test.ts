import assert from "node:assert/strict";
import test from "node:test";

import { CmsValidationError } from "./errors.ts";
import { mapProductsPayload } from "./product-mapper.ts";

const baseProduct = {
  documentId: "product-1",
  slug: "da-hong-pao-a1b2c3",
  type: "product",
  title: "Да Хун Пао",
  packageLabel: "50 г",
  price: 1600,
  stock: 3,
  cardExcerpt: "Минеральный утёсный улун.",
};

test("maps a published Strapi product into a storefront summary", () => {
  const [product] = mapProductsPayload(
    {
      data: [
        {
          ...baseProduct,
          mainImage: {
            alt: "Чайные листья",
            image: { url: "/storefront/tea.png" },
          },
        },
      ],
    },
    "http://localhost:9000",
  );

  assert.deepEqual(product, {
    id: "product-1",
    slug: "da-hong-pao-a1b2c3",
    type: "product",
    title: "Да Хун Пао",
    packageLabel: "50 г",
    priceRubles: 1600,
    excerpt: "Минеральный утёсный улун.",
    inStock: true,
    imageUrl: "http://localhost:9000/storefront/tea.png",
    imageAlt: "Чайные листья",
  });
});

test("maps zero stock and an absent image without inventing fallbacks", () => {
  const [product] = mapProductsPayload(
    { data: [{ ...baseProduct, stock: 0 }] },
    "http://localhost:9000",
  );

  assert.equal(product?.inStock, false);
  assert.equal(product?.imageUrl, undefined);
  assert.equal(product?.imageAlt, undefined);
});

test("rejects invalid CMS payloads at the mapper boundary", () => {
  assert.throws(
    () =>
      mapProductsPayload(
        { data: [{ ...baseProduct, price: 1.5 }] },
        "http://localhost:9000",
      ),
    CmsValidationError,
  );
});
