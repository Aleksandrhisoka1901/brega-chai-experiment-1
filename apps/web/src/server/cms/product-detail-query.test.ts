import assert from "node:assert/strict";
import test from "node:test";

import { productDetailRequest } from "./product-detail-query.ts";

test("requests native story Blocks while keeping articles as an independent zone", () => {
  const request = productDetailRequest("nabor", "utro-bez-slov");
  const url = new URL(request.path, "http://localhost");

  assert.equal(url.searchParams.get("status"), "published");
  assert.equal(url.searchParams.get("filters[type][$eq]"), "nabor");
  assert.equal(url.searchParams.get("filters[slug][$eq]"), "utro-bez-slov");
  assert.equal(url.searchParams.get("fields[9]"), "story");
  assert.equal(
    url.searchParams.get("populate[articles][fields][0]"),
    "content",
  );
  assert.equal(
    url.searchParams.get("populate[mainImage][populate][image][fields][4]"),
    "updatedAt",
  );
  assert.equal(
    url.searchParams.get("populate[gallery][populate][image][fields][4]"),
    "updatedAt",
  );
  assert.equal(
    url.searchParams.get("populate[seo][populate][image][fields][1]"),
    "updatedAt",
  );
  assert.deepEqual(request.tags, [
    "products",
    "product-slug:nabor:utro-bez-slov",
  ]);
});
