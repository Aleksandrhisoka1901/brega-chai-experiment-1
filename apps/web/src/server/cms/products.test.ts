import assert from "node:assert/strict";
import test from "node:test";

import { productCatalogRequests } from "./products-query.ts";

test("catalog requests published products by stock group and alphabet", () => {
  const [available, unavailable] = productCatalogRequests();
  assert.ok(available);
  assert.ok(unavailable);
  const availableUrl = new URL(available.path, "http://localhost");
  const unavailableUrl = new URL(unavailable.path, "http://localhost");

  assert.equal(availableUrl.searchParams.get("status"), "published");
  assert.equal(availableUrl.searchParams.get("filters[type][$eq]"), "tovar");
  assert.equal(availableUrl.searchParams.get("filters[stock][$gt]"), "0");
  assert.equal(availableUrl.searchParams.get("sort[0]"), "displayName:asc");
  assert.equal(availableUrl.searchParams.get("fields[0]"), "displayName");
  assert.equal(unavailableUrl.searchParams.get("filters[stock][$eq]"), "0");
  assert.equal(unavailableUrl.searchParams.get("sort[0]"), "displayName:asc");
  assert.equal(availableUrl.searchParams.has("filters[active][$eq]"), false);
  assert.equal(availableUrl.searchParams.has("sortOrder"), false);
});
