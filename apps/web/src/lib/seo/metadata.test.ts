import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalUrl,
  metadataWithFallbacks,
  pageMetadata,
  siteOrigin,
} from "./metadata.ts";

test("normalizes the configured canonical origin", () => {
  assert.equal(
    siteOrigin("https://Brega.Example/path/?q=1#part"),
    "https://brega.example",
  );
});

test("reads the canonical origin from runtime environment", () => {
  const originalSiteUrl = process.env.SITE_URL;
  process.env.SITE_URL = "https://runtime.brega.example";

  try {
    assert.equal(siteOrigin(), "https://runtime.brega.example");
  } finally {
    if (originalSiteUrl === undefined) {
      delete process.env.SITE_URL;
    } else {
      process.env.SITE_URL = originalSiteUrl;
    }
  }
});

test("builds lowercase canonical URLs without trailing slash", () => {
  assert.equal(
    canonicalUrl("/stantsii/DA-HONG-PAO", "https://brega.example/"),
    "https://brega.example/stantsii/da-hong-pao",
  );
  assert.equal(
    canonicalUrl("/", "https://brega.example"),
    "https://brega.example/",
  );
});

test("applies stable title and description fallbacks", () => {
  assert.deepEqual(metadataWithFallbacks({ title: "", description: null }), {
    title: "Voltora",
    description:
      "Портативные электростанции и солнечные панели для дома и резервного питания",
  });
});

test("adds an optional editorial image to Open Graph metadata", () => {
  const metadata = pageMetadata({
    title: "Да Хун Пао",
    description: "Утёсный улун.",
    imageUrl: "https://media.example.test/seo.png",
    path: "/stantsii/da-hun-pao",
  });

  assert.deepEqual(metadata.openGraph?.images, [
    { url: "https://media.example.test/seo.png" },
  ]);
  assert.deepEqual(metadata.robots, { index: false, follow: false });
});
