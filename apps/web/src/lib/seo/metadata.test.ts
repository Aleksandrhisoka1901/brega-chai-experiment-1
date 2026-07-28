import assert from "node:assert/strict";
import test from "node:test";

import { canonicalUrl, metadataWithFallbacks, siteOrigin } from "./metadata.ts";

test("normalizes the configured canonical origin", () => {
  assert.equal(
    siteOrigin("https://Brega.Example/path/?q=1#part"),
    "https://brega.example",
  );
});

test("builds lowercase canonical URLs without trailing slash", () => {
  assert.equal(
    canonicalUrl("/products/DA-HONG-PAO", "https://brega.example/"),
    "https://brega.example/products/da-hong-pao",
  );
  assert.equal(
    canonicalUrl("/", "https://brega.example"),
    "https://brega.example/",
  );
});

test("applies stable title and description fallbacks", () => {
  assert.deepEqual(metadataWithFallbacks({ title: "", description: null }), {
    title: "Brega Chai",
    description: "Чай и ритуалы Brega Chai",
  });
});
