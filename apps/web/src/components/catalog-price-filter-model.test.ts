import assert from "node:assert/strict";
import test from "node:test";

import {
  hasCatalogPriceFilter,
  parseCatalogPriceInput,
  resolveCatalogPriceFilter,
} from "./catalog-price-filter-model.ts";

test("parses empty and positive integer price inputs", () => {
  assert.equal(parseCatalogPriceInput(""), undefined);
  assert.equal(parseCatalogPriceInput(" 1500 "), 1500);
  assert.equal(parseCatalogPriceInput("0"), null);
  assert.equal(parseCatalogPriceInput("01"), null);
  assert.equal(parseCatalogPriceInput("1.5"), null);
  assert.equal(parseCatalogPriceInput("abc"), null);
});

test("resolves catalog price query params and rejects malformed values", () => {
  assert.deepEqual(resolveCatalogPriceFilter({}), {});
  assert.deepEqual(
    resolveCatalogPriceFilter({ minPrice: "1000", maxPrice: "5000" }),
    { minPrice: 1000, maxPrice: 5000 },
  );
  assert.equal(resolveCatalogPriceFilter({ minPrice: "01" }), null);
  assert.equal(resolveCatalogPriceFilter({ maxPrice: ["2", "3"] }), null);
  assert.equal(hasCatalogPriceFilter({ minPrice: 1000 }), true);
  assert.equal(hasCatalogPriceFilter({}), false);
});
