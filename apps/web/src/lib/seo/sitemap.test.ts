import assert from "node:assert/strict";
import test from "node:test";

import {
  groupedSitemapEntries,
  HTML_SITEMAP_PATH,
  mergeSitemapEntries,
  STATIC_SITEMAP_PAGES,
  toMetadataSitemap,
} from "./sitemap.ts";

test("always lists the public storefront sections in the sitemap", () => {
  const paths = STATIC_SITEMAP_PAGES.map((entry) => entry.path);

  assert.deepEqual(paths, [
    "/",
    "/stantsii",
    "/paneli",
    "/stati",
    "/dlya-optovikov",
    "/tipovye-resheniya",
    "/legal/deklaraciya-sootvetstviya",
    HTML_SITEMAP_PATH,
  ]);
});

test("merges catalog URLs without duplicating static sections", () => {
  const entries = mergeSitemapEntries([
    {
      path: "/paneli/ctechi-sp-200",
      title: "CTECHi SP-200",
      group: "paneli",
      priority: 0.8,
      changeFrequency: "weekly",
      lastModified: "2026-01-01T00:00:00.000Z",
    },
    {
      path: "/stantsii",
      title: "should not replace",
      group: "stantsii",
      priority: 0.1,
      changeFrequency: "monthly",
    },
  ]);

  assert.equal(entries.filter((entry) => entry.path === "/stantsii").length, 1);
  assert.equal(
    entries.find((entry) => entry.path === "/stantsii")?.title,
    "Портативные электростанции",
  );
  assert.ok(entries.some((entry) => entry.path === "/paneli/ctechi-sp-200"));
});

test("builds Google-facing loc URLs from merged entries", () => {
  const sitemap = toMetadataSitemap(
    mergeSitemapEntries([
      {
        path: "/paneli/ctechi-sp-200",
        title: "CTECHi SP-200",
        group: "paneli",
        priority: 0.8,
        changeFrequency: "weekly",
      },
    ]),
    "https://lon-energy.ru",
  );

  assert.ok(sitemap.some((entry) => entry.url === "https://lon-energy.ru/"));
  assert.ok(
    sitemap.some(
      (entry) => entry.url === "https://lon-energy.ru/paneli/ctechi-sp-200",
    ),
  );
  assert.equal(
    groupedSitemapEntries(
      mergeSitemapEntries([
        {
          path: "/stati/kak-vybrat",
          title: "Как выбрать",
          group: "stati",
          priority: 0.7,
          changeFrequency: "weekly",
        },
      ]),
    )
      .map((group) => group.group)
      .join(","),
    "sections,stati",
  );
});
