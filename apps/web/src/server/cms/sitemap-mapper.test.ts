import assert from "node:assert/strict";
import test from "node:test";

import { mapSitemapProductsPayload } from "./sitemap-mapper.ts";

test("maps only active published products and rituals", () => {
  const entries = mapSitemapProductsPayload({
    data: [
      {
        slug: "green-tea-a1b2c3",
        type: "product",
        active: true,
        publishedAt: "2026-07-20T10:00:00.000Z",
        updatedAt: "2026-07-21T10:00:00.000Z",
      },
      {
        slug: "draft-tea-a1b2c3",
        type: "product",
        active: true,
        publishedAt: null,
        updatedAt: "2026-07-21T10:00:00.000Z",
      },
      {
        slug: "hidden-ritual-a1b2c3",
        type: "ritual",
        active: false,
        publishedAt: "2026-07-20T10:00:00.000Z",
        updatedAt: "2026-07-21T10:00:00.000Z",
      },
    ],
  });

  assert.deepEqual(entries, [
    {
      slug: "green-tea-a1b2c3",
      type: "product",
      updatedAt: "2026-07-21T10:00:00.000Z",
    },
  ]);
});
