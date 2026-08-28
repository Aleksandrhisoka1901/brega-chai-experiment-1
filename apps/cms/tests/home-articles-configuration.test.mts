import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ARTICLES_PREVIEW,
  ensureHomeArticlesPreview,
} from "../src/home-articles-configuration.ts";

function harness({
  draft = {
    documentId: "home-1",
    articlesPreview: null,
    featuredArticles: [],
  },
  published = {
    documentId: "home-1",
    articlesPreview: null,
    featuredArticles: [],
  },
  articles = [{ documentId: "article-2" }, { documentId: "article-1" }],
}: {
  draft?: {
    documentId: string;
    articlesPreview: unknown;
    featuredArticles: unknown[];
  } | null;
  published?: {
    documentId: string;
    articlesPreview: unknown;
    featuredArticles: unknown[];
  } | null;
  articles?: Array<{ documentId: string }>;
} = {}) {
  const updates: unknown[] = [];
  const strapi = {
    documents(uid: string) {
      if (uid === "api::home-page.home-page") {
        return {
          async findMany({ status }: { status: "draft" | "published" }) {
            const home = status === "published" ? published : draft;
            return home ? [home] : [];
          },
          async update(input: unknown) {
            updates.push(input);
          },
        };
      }

      assert.equal(uid, "api::article.article");
      return {
        async findMany() {
          return articles;
        },
      };
    },
  };

  return { strapi, updates };
}

test("fills missing home articles preview on draft and published versions", async () => {
  const { strapi, updates } = harness();

  await ensureHomeArticlesPreview(strapi);

  assert.deepEqual(updates, [
    {
      documentId: "home-1",
      status: "draft",
      data: {
        articlesPreview: { ...DEFAULT_ARTICLES_PREVIEW },
        featuredArticles: { set: ["article-2", "article-1"] },
      },
    },
    {
      documentId: "home-1",
      status: "published",
      data: {
        articlesPreview: { ...DEFAULT_ARTICLES_PREVIEW },
        featuredArticles: { set: ["article-2", "article-1"] },
      },
    },
  ]);
});

test("leaves an already configured home articles preview untouched", async () => {
  const { strapi, updates } = harness({
    draft: {
      documentId: "home-1",
      articlesPreview: { title: "Журнал" },
      featuredArticles: [],
    },
    published: {
      documentId: "home-1",
      articlesPreview: { title: "Журнал" },
      featuredArticles: [],
    },
  });

  await ensureHomeArticlesPreview(strapi);

  assert.deepEqual(updates, []);
});
