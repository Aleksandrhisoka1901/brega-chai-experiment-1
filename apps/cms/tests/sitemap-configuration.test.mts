import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_SITEMAP_ARTICLE_COLLECTION,
  DEFAULT_SITEMAP_COLLECTION,
  DEFAULT_SITEMAP_URLS,
  ensureSitemapConfiguration,
  normalizeSitemapOrigin,
  SITEMAP_PERMISSION_ACTION,
} from "../src/sitemap-configuration.ts";

test("normalizes the public sitemap origin", () => {
  assert.equal(
    normalizeSitemapOrigin("https://bregalliance.ru/catalog?preview=1"),
    "https://bregalliance.ru",
  );
  assert.throws(
    () => normalizeSitemapOrigin("ftp://bregalliance.ru"),
    /http or https/,
  );
  assert.throws(
    () => normalizeSitemapOrigin("https://user:pass@bregalliance.ru"),
    /credentials/,
  );
});

test("creates the minimal sitemap configuration and public permission", async () => {
  assert.deepEqual(
    DEFAULT_SITEMAP_URLS.map(({ slug }) => slug),
    ["/", "/stantsii", "/paneli", "/stati"],
  );
  const creates = new Map<string, unknown[]>();
  const query = (uid: string) => ({
    async findMany() {
      return [];
    },
    async findOne() {
      if (uid === "plugin::users-permissions.role") {
        return { id: 2, permissions: [] };
      }
      return null;
    },
    async create(input: { data: unknown }) {
      creates.set(uid, [...(creates.get(uid) ?? []), input.data]);
    },
    async delete() {},
    async update() {
      throw new Error("unexpected update");
    },
  });

  await ensureSitemapConfiguration(
    { db: { query } },
    "https://bregalliance.ru/",
  );

  assert.deepEqual(
    creates.get(
      "plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-option",
    ),
    [
      {
        baseUrl: "https://bregalliance.ru",
        excludedUrls: [],
        useSitemapIndex: false,
        sitemapDefinitions: [],
      },
    ],
  );
  assert.deepEqual(
    creates.get(
      "plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-content-type",
    ),
    [DEFAULT_SITEMAP_COLLECTION, DEFAULT_SITEMAP_ARTICLE_COLLECTION],
  );
  assert.deepEqual(
    creates.get(
      "plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-content-type-single-url",
    ),
    [...DEFAULT_SITEMAP_URLS],
  );
  assert.deepEqual(creates.get("plugin::users-permissions.permission"), [
    { action: SITEMAP_PERMISSION_ACTION, role: 2 },
  ]);
});

test("preserves editor-managed sitemap configuration", async () => {
  let createCount = 0;
  let updateCount = 0;
  const query = (uid: string) => ({
    async findMany() {
      if (uid.endsWith("option")) {
        return [{ id: 1, baseUrl: "https://editor.example" }];
      }
      if (uid.endsWith("content-type")) {
        return [
          { type: "product", pattern: "/custom/[slug]" },
          { type: "article", pattern: "/stati/[slug]" },
        ];
      }
      return DEFAULT_SITEMAP_URLS;
    },
    async findOne() {
      return {
        id: 2,
        permissions: [{ action: SITEMAP_PERMISSION_ACTION }],
      };
    },
    async create() {
      createCount += 1;
    },
    async delete() {},
    async update() {
      updateCount += 1;
    },
  });

  await ensureSitemapConfiguration(
    { db: { query } },
    "https://runtime.example",
  );
  assert.equal(createCount, 0);
  assert.equal(updateCount, 0);
});

test("migrates the legacy product sitemap pattern to catalog routes", async () => {
  const updates: unknown[] = [];
  const query = (uid: string) => ({
    async findMany() {
      if (uid.endsWith("option")) {
        return [{ id: 1, baseUrl: "https://bregalliance.ru" }];
      }
      if (uid.endsWith("content-type")) {
        return [
          { id: 4, type: "product", pattern: "/[type]y/[slug]" },
          { id: 5, type: "article", pattern: "/stati/[slug]" },
        ];
      }
      return DEFAULT_SITEMAP_URLS;
    },
    async findOne() {
      return {
        id: 2,
        permissions: [{ action: SITEMAP_PERMISSION_ACTION }],
      };
    },
    async create() {
      throw new Error("unexpected create");
    },
    async delete() {},
    async update(input: { where: { id: number }; data: unknown }) {
      updates.push(input);
    },
  });

  await ensureSitemapConfiguration(
    { db: { query } },
    "https://bregalliance.ru",
  );
  assert.deepEqual(updates, [
    {
      where: { id: 4 },
      data: { pattern: DEFAULT_SITEMAP_COLLECTION.pattern },
    },
  ]);
});
