import assert from "node:assert/strict";
import test from "node:test";

import {
  catalogPageHref,
  catalogPaginationModel,
  resolveCatalogPage,
} from "./catalog-pagination-model.ts";

test("resolves the absent page as page one and flags its query alias", () => {
  assert.deepEqual(resolveCatalogPage(undefined), {
    page: 1,
    redirectToFirstPage: false,
  });
  assert.deepEqual(resolveCatalogPage("1"), {
    page: 1,
    redirectToFirstPage: true,
  });
  assert.deepEqual(resolveCatalogPage("2"), {
    page: 2,
    redirectToFirstPage: false,
  });
});

test("rejects malformed, repeated, non-positive and unsafe page values", () => {
  for (const value of [
    "",
    "0",
    "-1",
    "1.5",
    "01",
    "+2",
    " 2",
    "9007199254740992",
    ["2", "3"],
  ]) {
    assert.equal(resolveCatalogPage(value), null, JSON.stringify(value));
  }
});

test("builds canonical catalog links and navigation boundaries", () => {
  assert.equal(catalogPageHref("/tovary", 1), "/tovary");
  assert.equal(catalogPageHref("/tovary", 3), "/tovary?page=3");

  assert.deepEqual(catalogPaginationModel(20, 2), {
    currentPage: 2,
    totalPages: 3,
    pages: [1, 2, 3],
    previousPage: 1,
    nextPage: 3,
  });
  assert.deepEqual(catalogPaginationModel(8, 1), {
    currentPage: 1,
    totalPages: 1,
    pages: [1],
    previousPage: null,
    nextPage: null,
  });
});
