import assert from "node:assert/strict";
import test from "node:test";

import {
  breadcrumbStructuredData,
  organizationStructuredData,
  productStructuredData,
  serializeJsonLd,
  websiteStructuredData,
} from "./structured-data.ts";

test("uses integer RUB price and DTO availability in Product JSON-LD", () => {
  const data = productStructuredData(
    {
      id: "product-1",
      slug: "tea",
      type: "tovar",
      title: "Чай",
      breadcrumbLabel: "Чай",
      categoryLabel: "сорт чая",
      packageLabel: "50 г",
      priceRubles: 1600,
      currency: "RUB",
      stock: 2,
      inStock: true,
      excerpt: "Тихий чай.",
      story: "История.",
      articles: [],
      images: [],
    },
    "https://brega.example/tovary/tea",
    "Брега",
  );

  assert.equal(data.offers.price, 1600);
  assert.equal(data.offers.priceCurrency, "RUB");
  assert.equal(data.offers.availability, "https://schema.org/InStock");
  assert.equal(data.category, "сорт чая");
  assert.equal(data.brand.name, "Брега");
  assert.equal("aggregateRating" in data, false);
});

test("uses the editable entity category in Product JSON-LD", () => {
  const data = productStructuredData(
    {
      id: "nabor-1",
      slug: "quiet-morning",
      type: "nabor",
      title: "Утро без слов",
      breadcrumbLabel: "Утро без слов",
      categoryLabel: "чайный ритуал",
      packageLabel: "Набор",
      priceRubles: 4200,
      currency: "RUB",
      stock: 2,
      inStock: true,
      excerpt: "Чайный сценарий.",
      story: "История.",
      articles: [],
      images: [],
    },
    "https://brega.example/nabory/quiet-morning",
  );

  assert.equal(data.category, "чайный ритуал");
});

test("escapes opening angle brackets during JSON-LD serialization", () => {
  assert.equal(serializeJsonLd({ name: "</script>" }).includes("<"), false);
});

test("keeps breadcrumb order, labels, and canonical URLs", () => {
  const data = breadcrumbStructuredData([
    { name: "Главная", url: "https://brega.example/" },
    { name: "Сорта", url: "https://brega.example/tovary" },
    {
      name: "Да Хун Пао",
      url: "https://brega.example/tovary/da-hun-pao",
    },
  ]);

  assert.deepEqual(
    data.itemListElement.map(({ position, name, item }) => ({
      position,
      name,
      item,
    })),
    [
      { position: 1, name: "Главная", item: "https://brega.example/" },
      {
        position: 2,
        name: "Сорта",
        item: "https://brega.example/tovary",
      },
      {
        position: 3,
        name: "Да Хун Пао",
        item: "https://brega.example/tovary/da-hun-pao",
      },
    ],
  );
});

test("uses the CMS brand name for organization and website identity", () => {
  assert.equal(
    organizationStructuredData("https://brega.example", "Брега").name,
    "Брега",
  );
  assert.equal(
    websiteStructuredData("https://brega.example", "Брега").name,
    "Брега",
  );
});
