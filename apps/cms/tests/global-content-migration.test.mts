import assert from "node:assert/strict";
import { test } from "node:test";

import { ensureGlobalContentDefaults } from "../src/content-migration.ts";

test("global content migration fills missing components for draft and published versions", async () => {
  const updates: unknown[] = [];
  const documents = {
    async findMany({ status }: { status: string }) {
      return [{ documentId: `settings-${status}` }];
    },
    async update(input: unknown) {
      updates.push(input);
    },
  };
  const strapi = {
    documents(uid: string) {
      assert.equal(uid, "api::global-setting.global-setting");
      return documents;
    },
  };

  await ensureGlobalContentDefaults(strapi);

  assert.deepEqual(updates, [
    {
      documentId: "settings-draft",
      status: "draft",
      data: {
        sectionBreadcrumbs: [
          { route: "tovary", label: "Сорта" },
          { route: "nabory", label: "Ритуалы" },
        ],
        storefrontTexts: {
          imagePlaceholder: "Изображение готовится",
          outOfStock: "Нет в наличии",
        },
      },
    },
    {
      documentId: "settings-published",
      status: "published",
      data: {
        sectionBreadcrumbs: [
          { route: "tovary", label: "Сорта" },
          { route: "nabory", label: "Ритуалы" },
        ],
        storefrontTexts: {
          imagePlaceholder: "Изображение готовится",
          outOfStock: "Нет в наличии",
        },
      },
    },
  ]);
});

test("global content migration leaves complete settings untouched", async () => {
  let updateCount = 0;
  const strapi = {
    documents() {
      return {
        async findMany() {
          return [
            {
              documentId: "settings",
              sectionBreadcrumbs: [
                { route: "tovary", label: "Каталог" },
                { route: "nabory", label: "Коллекции" },
              ],
              storefrontTexts: {
                imagePlaceholder: "Скоро",
                outOfStock: "Закончилось",
              },
            },
          ];
        },
        async update() {
          updateCount += 1;
        },
      };
    },
  };

  await ensureGlobalContentDefaults(strapi);
  assert.equal(updateCount, 0);
});
