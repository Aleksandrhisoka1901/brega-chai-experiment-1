import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import adminApp from "../src/admin/app.ts";

const schemas = [
  [
    "api/global-setting/content-types/global-setting/schema.json",
    "api::global-setting.global-setting",
  ],
  [
    "api/home-page/content-types/home-page/schema.json",
    "api::home-page.home-page",
  ],
  ["api/order/content-types/order/schema.json", "api::order.order"],
  ["api/product/content-types/product/schema.json", "api::product.product"],
  [
    "api/products-page/content-types/products-page/schema.json",
    "api::products-page.products-page",
  ],
  ["components/home/catalog-preview.json", "home.catalog-preview"],
  ["components/home/editorial-section.json", "home.editorial-section"],
  ["components/home/hero.json", "home.hero"],
  ["components/home/rituals-preview.json", "home.rituals-preview"],
  ["components/product/article.json", "product.article"],
  ["components/product/gallery-image.json", "product.gallery-image"],
  ["components/shared/image-with-alt.json", "shared.image-with-alt"],
  ["components/shared/link.json", "shared.link"],
  ["components/shared/navigation-labels.json", "shared.navigation-labels"],
  ["components/shared/section-breadcrumb.json", "shared.section-breadcrumb"],
  ["components/shared/seo.json", "shared.seo"],
  ["components/shared/storefront-texts.json", "shared.storefront-texts"],
] as const;

const translations = adminApp.config.translations.ru;

test("enables Russian Strapi Admin and labels every custom field", async () => {
  assert.deepEqual(adminApp.config.locales, ["ru"]);

  for (const [path, uid] of schemas) {
    const schema = JSON.parse(
      await readFile(new URL(`../src/${path}`, import.meta.url), "utf8"),
    ) as {
      info: { displayName: string };
      attributes: Record<string, unknown>;
    };

    assert.match(schema.info.displayName, /[А-Яа-яЁё]/, path);

    for (const attribute of Object.keys(schema.attributes)) {
      const prefix = path.startsWith("api/")
        ? `content-manager.content-types.${uid}`
        : `content-manager.components.${uid}`;
      const key = `${prefix}.${attribute}` as keyof typeof translations;
      assert.equal(
        typeof translations[key],
        "string",
        `Missing Russian Admin label: ${key}`,
      );
      assert.match(translations[key], /[А-Яа-яЁё]/, key);
    }
  }

  assert.equal(
    translations["content-manager.content-types.api::product.product.seedKey"],
    "Системный ключ",
  );
});
