import assert from "node:assert/strict";
import test from "node:test";

import { catalogGroupRequest, fetchCatalogPage } from "./products-query.ts";

function productRecord(index: number, stock: number) {
  const suffix = String(index).padStart(2, "0");
  return {
    documentId: `product-${suffix}`,
    slug: `product-${suffix}`,
    type: "tovar",
    displayName: `${stock > 0 ? "Доступный" : "Нет"} ${suffix}`,
    packageLabel: "50 г",
    price: 1000 + index,
    stock,
    cardExcerpt: "Описание",
    mainImage: null,
  };
}

test("catalog group requests published products by stock group and alphabet", () => {
  const available = catalogGroupRequest({
    type: "tovar",
    availability: "available",
    start: 8,
    limit: 8,
  });
  const unavailable = catalogGroupRequest({
    type: "nabor",
    availability: "unavailable",
    start: 3,
    limit: 17,
  });
  const availableUrl = new URL(available.path, "http://localhost");
  const unavailableUrl = new URL(unavailable.path, "http://localhost");

  assert.equal(availableUrl.searchParams.get("status"), "published");
  assert.equal(availableUrl.searchParams.get("filters[type][$eq]"), "tovar");
  assert.equal(availableUrl.searchParams.get("filters[stock][$gt]"), "0");
  assert.equal(availableUrl.searchParams.get("sort[0]"), "displayName:asc");
  assert.equal(availableUrl.searchParams.get("sort[1]"), "slug:asc");
  assert.equal(availableUrl.searchParams.get("pagination[start]"), "8");
  assert.equal(availableUrl.searchParams.get("pagination[limit]"), "8");
  assert.equal(availableUrl.searchParams.get("pagination[withCount]"), "true");
  assert.equal(availableUrl.searchParams.get("fields[0]"), "displayName");
  assert.equal(
    availableUrl.searchParams.get(
      "populate[mainImage][populate][image][fields][5]",
    ),
    "updatedAt",
  );
  assert.equal(unavailableUrl.searchParams.get("filters[type][$eq]"), "nabor");
  assert.equal(unavailableUrl.searchParams.get("filters[stock][$eq]"), "0");
  assert.equal(unavailableUrl.searchParams.get("sort[0]"), "displayName:asc");
  assert.equal(unavailableUrl.searchParams.get("pagination[start]"), "3");
  assert.equal(unavailableUrl.searchParams.get("pagination[limit]"), "17");
  assert.equal(availableUrl.searchParams.has("filters[active][$eq]"), false);
  assert.equal(availableUrl.searchParams.has("sortOrder"), false);
  assert.equal(availableUrl.searchParams.has("filters[price][$gte]"), false);
  assert.equal(availableUrl.searchParams.has("filters[price][$lte]"), false);
});

test("catalog group requests include optional price bounds", () => {
  const bounded = catalogGroupRequest({
    type: "tovar",
    availability: "available",
    start: 0,
    limit: 8,
    minPrice: 1000,
    maxPrice: 5000,
  });
  const url = new URL(bounded.path, "http://localhost");

  assert.equal(url.searchParams.get("filters[price][$gte]"), "1000");
  assert.equal(url.searchParams.get("filters[price][$lte]"), "5000");
  assert.equal(url.searchParams.get("filters[type][$eq]"), "tovar");
  assert.equal(url.searchParams.get("sort[0]"), "displayName:asc");
});

test("fetches eight globally ordered products without gaps between stock groups", async () => {
  const available = Array.from({ length: 11 }, (_, index) =>
    productRecord(index + 1, 5),
  );
  const unavailable = Array.from({ length: 4 }, (_, index) =>
    productRecord(index + 12, 0),
  );
  const calls: URL[] = [];

  const fetcher = async (path: string, options: { tags: string[] }) => {
    assert.deepEqual(options.tags, ["products"]);
    const url = new URL(path, "http://localhost");
    calls.push(url);
    const source = url.searchParams.has("filters[stock][$gt]")
      ? available
      : unavailable;
    const start = Number(url.searchParams.get("pagination[start]"));
    const limit = Number(url.searchParams.get("pagination[limit]"));

    return {
      data: source.slice(start, start + limit),
      meta: { pagination: { start, limit, total: source.length } },
    };
  };

  const first = await fetchCatalogPage(fetcher, "http://media.test", {
    type: "tovar",
    page: 1,
  });
  const second = await fetchCatalogPage(fetcher, "http://media.test", {
    type: "tovar",
    page: 2,
  });

  assert.equal(first.products.length, 8);
  assert.deepEqual(
    first.products.map(({ id }) => id),
    available.slice(0, 8).map(({ documentId }) => documentId),
  );
  assert.deepEqual(
    second.products.map(({ id }) => id),
    [...available.slice(8), ...unavailable].map(({ documentId }) => documentId),
  );
  assert.deepEqual(
    {
      page: second.page,
      pageSize: second.pageSize,
      totalItems: second.totalItems,
      totalPages: second.totalPages,
    },
    { page: 2, pageSize: 8, totalItems: 15, totalPages: 2 },
  );
  assert.equal(
    calls.every((url) => url.searchParams.get("sort[0]") === "displayName:asc"),
    true,
  );
});

test("forwards price bounds to both stock-group catalog queries", async () => {
  const fetcher = async (path: string) => {
    const url = new URL(path, "http://localhost");
    assert.equal(url.searchParams.get("filters[price][$gte]"), "1200");
    assert.equal(url.searchParams.get("filters[price][$lte]"), "1800");
    return {
      data: [],
      meta: { pagination: { start: 0, limit: 8, total: 0 } },
    };
  };

  const page = await fetchCatalogPage(fetcher, "http://media.test", {
    type: "nabor",
    page: 1,
    minPrice: 1200,
    maxPrice: 1800,
  });

  assert.deepEqual(
    {
      products: page.products,
      totalItems: page.totalItems,
      totalPages: page.totalPages,
    },
    { products: [], totalItems: 0, totalPages: 1 },
  );
});
