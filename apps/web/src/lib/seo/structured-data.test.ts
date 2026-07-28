import assert from "node:assert/strict";
import test from "node:test";

import { productStructuredData, serializeJsonLd } from "./structured-data.ts";

test("uses integer RUB price and DTO availability in Product JSON-LD", () => {
  const data = productStructuredData(
    {
      id: "product-1",
      slug: "tea-a1b2c3",
      type: "product",
      title: "Чай",
      packageLabel: "50 г",
      priceRubles: 1600,
      currency: "RUB",
      stock: 2,
      inStock: true,
      excerpt: "Тихий чай.",
      story: "История.",
      images: [],
    },
    "https://brega.example/products/tea-a1b2c3",
  );

  assert.equal(data.offers.price, 1600);
  assert.equal(data.offers.priceCurrency, "RUB");
  assert.equal(data.offers.availability, "https://schema.org/InStock");
  assert.equal("aggregateRating" in data, false);
});

test("escapes opening angle brackets during JSON-LD serialization", () => {
  assert.equal(serializeJsonLd({ name: "</script>" }).includes("<"), false);
});
