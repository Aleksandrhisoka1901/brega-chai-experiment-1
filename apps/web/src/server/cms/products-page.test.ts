import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchProductsPageContent,
  productsPageRequest,
} from "./products-page-mapper.ts";

test("requests only published products-page fields and tags the products cache", () => {
  const { path, tags } = productsPageRequest();
  const url = new URL(path, "http://localhost");

  assert.equal(url.pathname, "/api/products-page");
  assert.equal(url.searchParams.get("status"), "published");
  assert.equal(url.searchParams.get("fields[0]"), "title");
  assert.equal(url.searchParams.get("fields[1]"), "intro");
  assert.equal(url.searchParams.get("populate[seo][fields][0]"), "title");
  assert.equal(url.searchParams.get("populate[seo][fields][1]"), "description");
  assert.equal(url.searchParams.get("populate[image][fields][0]"), "alt");
  assert.equal(
    url.searchParams.get("populate[image][populate][image][fields][0]"),
    "url",
  );
  assert.equal(
    url.searchParams.get("populate[image][populate][image][fields][1]"),
    "width",
  );
  assert.equal(
    url.searchParams.get("populate[image][populate][image][fields][2]"),
    "height",
  );
  assert.deepEqual(tags, ["products"]);
});

test("fetches and maps the products-page through the narrow request boundary", async () => {
  const calls: Array<{ path: string; options: { tags: string[] } }> = [];
  const content = await fetchProductsPageContent(async (path, options) => {
    calls.push({ path, options });

    return {
      data: {
        title: "Коллекция",
        intro: [
          {
            type: "paragraph",
            children: [{ type: "text", text: "Редкие сорта." }],
          },
        ],
        seo: { title: "Коллекция чая", description: "Каталог чая." },
      },
    };
  }, "http://localhost:9000");

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.options.tags, ["products"]);
  assert.match(calls[0]?.path ?? "", /^\/api\/products-page\?/);
  assert.equal(content.title, "Коллекция");
  assert.deepEqual(content.intro, [
    {
      type: "paragraph",
      children: [{ type: "text", text: "Редкие сорта." }],
    },
  ]);
});
