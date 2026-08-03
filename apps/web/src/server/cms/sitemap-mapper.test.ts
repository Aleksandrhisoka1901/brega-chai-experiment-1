import assert from "node:assert/strict";
import test from "node:test";

import { mapSitemapProductsPayload } from "./sitemap-mapper.ts";

test("maps only published tovary and nabory", () => {
  const entries = mapSitemapProductsPayload({
    data: [
      {
        slug: "green-tea",
        type: "tovar",
        publishedAt: "2026-07-20T10:00:00.000Z",
        updatedAt: "2026-07-21T10:00:00.000Z",
      },
      {
        slug: "draft-tea",
        type: "tovar",
        publishedAt: null,
        updatedAt: "2026-07-21T10:00:00.000Z",
      },
    ],
  });

  assert.deepEqual(entries, [
    {
      slug: "green-tea",
      type: "tovar",
      updatedAt: "2026-07-21T10:00:00.000Z",
    },
  ]);
});
