import assert from "node:assert/strict";
import test from "node:test";

import type { OrderResult } from "@brega-chai/contracts";

import { invalidateOrderStock } from "./invalidation.ts";

test("invalidates product data and possible detail routes after an order", () => {
  const tags: string[] = [];
  const paths: Array<[string, string | undefined]> = [];
  const order = {
    lines: [{ slug: "sencha" }, { slug: "ritual-one" }, { slug: "sencha" }],
  } as OrderResult;

  invalidateOrderStock(order, {
    revalidatePath: (path, type) => paths.push([path, type]),
    revalidateTag: (tag) => tags.push(tag),
  });

  assert.deepEqual(tags, [
    "products",
    "product-slug:tovar:sencha",
    "product-slug:nabor:sencha",
    "product-slug:tovar:ritual-one",
    "product-slug:nabor:ritual-one",
  ]);
  assert.deepEqual(paths, [
    ["/", "page"],
    ["/tovary", "page"],
    ["/tovary/sencha", "page"],
    ["/nabory/sencha", "page"],
    ["/tovary/ritual-one", "page"],
    ["/nabory/ritual-one", "page"],
  ]);
});
