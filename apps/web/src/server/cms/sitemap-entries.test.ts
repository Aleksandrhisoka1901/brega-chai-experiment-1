import assert from "node:assert/strict";
import test from "node:test";

import { HTML_SITEMAP_PATH } from "../../lib/seo/sitemap.ts";

import { loadSitemapEntries } from "./sitemap-entries.ts";

test("keeps static pages when CMS catalog requests fail", async () => {
  const entries = await loadSitemapEntries(async () => {
    throw new Error("CMS down");
  });

  assert.ok(entries.some((entry) => entry.path === "/"));
  assert.ok(entries.some((entry) => entry.path === "/paneli"));
  assert.ok(entries.some((entry) => entry.path === HTML_SITEMAP_PATH));
  assert.equal(
    entries.some((entry) => entry.path.startsWith("/paneli/")),
    false,
  );
});

test("adds published products and articles to the public sitemap", async () => {
  const entries = await loadSitemapEntries(async (path) => {
    if (path.startsWith("/api/products?")) {
      return {
        data: [
          {
            slug: "ctechi-sp-200",
            type: "nabor",
            displayName: "CTECHi SP-200",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          {
            slug: "gt200",
            type: "tovar",
            displayName: "CTECHi GT200",
          },
          { slug: "broken" },
        ],
      };
    }
    if (path.startsWith("/api/articles?")) {
      return {
        data: [
          {
            slug: "kak-vybrat",
            name: "Как выбрать станцию",
            updatedAt: "2026-02-01T00:00:00.000Z",
          },
        ],
      };
    }
    throw new Error(`unexpected ${path}`);
  });

  const panel = entries.find((entry) => entry.path === "/paneli/ctechi-sp-200");
  const station = entries.find((entry) => entry.path === "/stantsii/gt200");
  const article = entries.find((entry) => entry.path === "/stati/kak-vybrat");

  assert.equal(panel?.title, "CTECHi SP-200");
  assert.equal(panel?.lastModified, "2026-01-01T00:00:00.000Z");
  assert.equal(station?.group, "stantsii");
  assert.equal(article?.title, "Как выбрать станцию");
  assert.equal(
    entries.some((entry) => entry.path === "/paneli/broken"),
    false,
  );
});
