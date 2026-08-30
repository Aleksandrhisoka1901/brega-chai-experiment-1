import assert from "node:assert/strict";
import test from "node:test";

import {
  ensureChapterEyebrowsCleared,
  sanitizeEditorialEyebrow,
} from "../src/chapter-eyebrow.ts";

test("keeps a real label after a chapter prefix", () => {
  assert.equal(sanitizeEditorialEyebrow("Глава 01 · О компании"), "О компании");
  assert.equal(sanitizeEditorialEyebrow("Глава 03"), undefined);
});

test("rewrites chapter eyebrows on home components and landing pages", async () => {
  const componentUpdates: Array<{ uid: string; data: unknown }> = [];
  const pageUpdates: unknown[] = [];

  const strapi = {
    documents(uid: string) {
      if (uid === "api::home-page.home-page") {
        return {
          async findMany() {
            return [
              {
                hero: { id: 1, eyebrow: "Энергия рядом. Всегда." },
                about: { id: 2, eyebrow: "Глава 01 · О компании" },
                naboryPreview: { id: 3, eyebrow: "Глава 03" },
                tovaryPreview: { id: 4, eyebrow: "Глава 02" },
                articlesPreview: { id: 5, eyebrow: "Глава 04" },
              },
            ];
          },
        };
      }

      return {
        async findMany() {
          return [{ documentId: `${uid}-1`, eyebrow: "Глава 02" }];
        },
        async update(input: unknown) {
          pageUpdates.push({ uid, input });
        },
      };
    },
    db: {
      query(uid: string) {
        return {
          async update(input: { data: unknown }) {
            componentUpdates.push({ uid, data: input.data });
          },
        };
      },
    },
  };

  await ensureChapterEyebrowsCleared(strapi);

  const expectedComponents = [
    { uid: "home.editorial-section", data: { eyebrow: "О компании" } },
    { uid: "home.rituals-preview", data: { eyebrow: null } },
    { uid: "home.catalog-preview", data: { eyebrow: null } },
    { uid: "home.articles-preview", data: { eyebrow: null } },
  ];
  assert.deepEqual(componentUpdates, [
    ...expectedComponents,
    ...expectedComponents,
  ]);
  assert.equal(pageUpdates.length, 6);
});
