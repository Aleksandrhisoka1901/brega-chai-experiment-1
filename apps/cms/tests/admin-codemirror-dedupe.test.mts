import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  applyAdminContentManagerPreset,
  applyRussianFieldLabels,
  configureOrderReadOnlyFields,
  configureProductFields,
  configureSingleTypeMainField,
  getRussianFieldLabels,
  syncAdminContentManager,
} from "../src/admin-content-manager.ts";
import { russianAdminTranslations } from "../src/admin/app.ts";
import viteConfig from "../src/admin/vite.config.ts";

test("deduplicates the CodeMirror module graph used by Strapi JSON fields", () => {
  const config = viteConfig({}) as {
    resolve?: { dedupe?: string[] };
  };
  const dedupe = config.resolve?.dedupe ?? [];

  for (const module of [
    "react",
    "react-dom",
    "react-router-dom",
    "styled-components",
    "@codemirror/state",
    "@codemirror/view",
    "@codemirror/language",
    "@uiw/react-codemirror",
    "codemirror",
  ]) {
    assert.ok(dedupe.includes(module), `Missing Vite dedupe entry: ${module}`);
  }

  assert.equal(config.server?.host, "0.0.0.0");
  assert.deepEqual(config.server?.hmr, {
    host: "localhost",
    clientPort: 5173,
  });
});

test("keeps Strapi JSON inputs on one CodeMirror extension graph", async () => {
  const patch = await readFile(
    new URL(
      "../../../.yarn/patches/@strapi-design-system-npm-2.2.0-b2f5d1e3a9.patch",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(patch, /\+\s+extensions: \[Oh\(\)\],/);
  assert.doesNotMatch(patch, /\+\s+extensions: \[Oh\(\), xp\],/);
});

test("keeps the seed key private and hidden from editors", async () => {
  const schema = JSON.parse(
    await readFile(
      new URL(
        "../src/api/product/content-types/product/schema.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as {
    config: {
      attributes: {
        seedKey: {
          hidden: boolean;
        };
      };
    };
    attributes: {
      seedKey: {
        private: boolean;
      };
    };
  };
  const seedKey = schema.attributes.seedKey;

  assert.equal(seedKey.private, true);
  assert.equal(schema.config.attributes.seedKey.hidden, true);
});

test("configures technical and storefront product names in Content Manager", () => {
  const configuration = configureProductFields({
    layouts: {
      edit: [
        [
          { name: "title", size: 6 },
          { name: "seedKey", size: 6 },
        ],
        [{ name: "slug", size: 12 }],
      ],
      list: ["title", "seedKey", "slug"],
    },
    settings: {},
    metadatas: {
      title: { edit: { visible: true }, list: {} },
      displayName: { edit: { visible: true }, list: {} },
      seedKey: {
        edit: { visible: true, editable: true },
        list: { searchable: true },
      },
      slug: { edit: { visible: true, editable: true }, list: {} },
    },
  });

  assert.deepEqual(configuration.layouts.edit, [
    [{ name: "title", size: 6 }],
    [{ name: "slug", size: 12 }],
  ]);
  assert.deepEqual(configuration.layouts.list, [
    "title",
    "slug",
    "displayName",
  ]);
  assert.deepEqual(configuration.metadatas.seedKey.edit, {
    visible: false,
    editable: false,
  });
  assert.deepEqual(configuration.metadatas.slug.edit, {
    visible: true,
    editable: false,
  });
  assert.ok(
    configuration.layouts.edit.some((row) =>
      row.some((field) => field.name === "slug"),
    ),
  );
  assert.ok(configuration.layouts.list.includes("slug"));
});

test("makes every order field read-only in Content Manager", () => {
  const configuration = configureOrderReadOnlyFields({
    layouts: {
      edit: [[{ name: "orderNumber", size: 6 }]],
      list: ["orderNumber", "orderStatus"],
    },
    settings: {},
    metadatas: {
      orderNumber: { edit: { visible: true, editable: true }, list: {} },
      orderStatus: { edit: { visible: true, editable: true }, list: {} },
    },
  });

  assert.equal(configuration.metadatas.orderNumber.edit.editable, false);
  assert.equal(configuration.metadatas.orderStatus.edit.editable, false);
  assert.deepEqual(configuration.layouts.list, ["orderNumber", "orderStatus"]);
});

test("uses the menu display name as every local single-type title", () => {
  const configuration = configureSingleTypeMainField({
    layouts: { edit: [], list: [] },
    settings: {
      mainField: "documentId",
      defaultSortBy: "documentId",
    },
    metadatas: {},
  });

  assert.equal(configuration.settings.mainField, "id");
  assert.equal(configuration.settings.defaultSortBy, "documentId");
});

test("writes Russian labels into Content Manager metadata", () => {
  const labels = getRussianFieldLabels(
    "api::global-setting.global-setting",
    false,
    russianAdminTranslations,
  );
  const configuration = applyRussianFieldLabels(
    {
      layouts: {
        edit: [[{ name: "brandName", size: 6 }]],
        list: ["brandName"],
      },
      settings: {},
      metadatas: {
        brandName: {
          edit: { label: "brandName", visible: true },
          list: { label: "brandName", searchable: true },
        },
        id: { edit: {}, list: { label: "id" } },
      },
    },
    labels,
  );

  assert.equal(configuration.metadatas.brandName.edit.label, "Название бренда");
  assert.equal(configuration.metadatas.brandName.list.label, "Название бренда");
  assert.equal(configuration.metadatas.id.edit.label, "Идентификатор");
  assert.equal(configuration.metadatas.id.list.label, "Идентификатор");
  assert.equal(
    getRussianFieldLabels("shared.link", true, russianAdminTranslations).id,
    "Идентификатор",
  );
});

test("applies canonical local Content Manager layouts", () => {
  const configuration = applyAdminContentManagerPreset("home.hero", {
    layouts: {
      edit: [[{ name: "eyebrow", size: 12 }]],
      list: ["id", "eyebrow"],
    },
    settings: { mainField: "eyebrow", defaultSortBy: "eyebrow" },
    metadatas: {},
  });

  assert.deepEqual(configuration.layouts.edit[0], [
    { name: "eyebrow", size: 4 },
    { name: "title", size: 8 },
  ]);
  assert.deepEqual(configuration.layouts.list, [
    "id",
    "title",
    "text",
    "layout",
  ]);
  assert.equal(configuration.settings.mainField, "title");
  assert.equal(configuration.settings.defaultSortBy, "title");
});

test("covers every editable storefront schema with a canonical layout", () => {
  const expectedFields: Record<string, string[]> = {
    "api::global-setting.global-setting": [
      "brandName",
      "currency",
      "logo",
      "email",
      "telegramUrl",
      "navigation",
      "storefrontTexts",
      "pickupAddress",
      "pickupDiscountPercent",
      "maxItemQuantity",
      "courierDeliveryNote",
      "orderNotificationEmail",
      "defaultProductStory",
      "sectionBreadcrumbs",
      "defaultSeo",
      "legalDetails",
      "legalDocuments",
    ],
    "api::home-page.home-page": [
      "hero",
      "about",
      "naboryPreview",
      "featuredNabory",
      "tovaryPreview",
      "featuredTovary",
      "seo",
    ],
    "api::product.product": [
      "title",
      "displayName",
      "slug",
      "type",
      "originalTitle",
      "packageLabel",
      "price",
      "stock",
      "currency",
      "cardExcerpt",
      "story",
      "mainImage",
      "gallery",
      "articles",
      "breadcrumbLabel",
      "categoryLabel",
      "seo",
    ],
    "api::products-page.products-page": [
      "eyebrow",
      "title",
      "intro",
      "emptyStateText",
      "emptyStateLinkLabel",
      "seo",
    ],
    "api::rituals-page.rituals-page": [
      "eyebrow",
      "title",
      "intro",
      "emptyStateText",
      "emptyStateLinkLabel",
      "seo",
    ],
    "api::articles-page.articles-page": [
      "eyebrow",
      "title",
      "intro",
      "emptyStateText",
      "emptyStateLinkLabel",
      "seo",
    ],
    "api::article.article": [
      "name",
      "priority",
      "slug",
      "image",
      "content",
      "blocks",
      "seo",
    ],
    "home.catalog-preview": ["eyebrow", "title", "subtitle", "linkLabel"],
    "home.editorial-section": [
      "eyebrow",
      "title",
      "textBlock1",
      "textBlock2",
      "spacing",
      "backgroundColor",
      "textColor",
    ],
    "home.hero": [
      "eyebrow",
      "title",
      "text",
      "layout",
      "backgroundColor",
      "textColor",
      "image",
      "cta",
    ],
    "home.rituals-preview": ["eyebrow", "title", "subtitle", "linkLabel"],
    "product.article": ["content"],
    "article.cards-grid": [
      "title",
      "gridColumns",
      "titleColor",
      "description",
      "cards",
    ],
    "article.card": [
      "title",
      "titleHtmlTag",
      "description",
      "titleColor",
      "descriptionColor",
      "descriptionLinksColor",
      "bgColor",
      "borderColor",
      "bulletText",
      "bulletIcon",
      "bulletPosition",
      "bulletAlign",
      "bulletScalePercent",
      "bulletTextColor",
      "bulletBgColor",
      "image",
      "imageAlt",
      "imagePosition",
      "imageFit",
      "imageAlign",
      "imageScalePercent",
      "disabledBg",
      "disabledPaddings",
      "bulletDisabledBg",
      "bulletDisabledPaddings",
      "gridColumnsStart",
      "gridColumnsSpan",
      "gridRowsStart",
      "gridRowsSpan",
    ],
    "product.gallery-image": ["image", "alt"],
    "shared.image-with-alt": ["image", "alt"],
    "shared.legal-documents": ["privacyPolicy", "terms", "deliveryAndReturns"],
    "shared.link": ["label", "url"],
    "shared.navigation-labels": ["about", "cart", "nabory", "tovary", "stati"],
    "shared.section-breadcrumb": ["route", "label"],
    "shared.seo": ["title", "description", "image"],
    "shared.storefront-texts": ["imagePlaceholder", "outOfStock"],
  };

  for (const [uid, fields] of Object.entries(expectedFields)) {
    const configuration = applyAdminContentManagerPreset(uid, {
      layouts: { edit: [], list: [] },
      settings: {},
      metadatas: {},
    });
    const actualFields = configuration.layouts.edit.flatMap((row) =>
      row.map(({ name }) => name),
    );

    assert.deepEqual(actualFields, fields, `Unexpected field order for ${uid}`);
    for (const row of configuration.layouts.edit) {
      assert.ok(
        row.reduce((total, field) => total + field.size, 0) <= 12,
        `Layout row exceeds 12 columns for ${uid}`,
      );
      for (const field of row) {
        assert.ok(
          [4, 6, 8, 12].includes(field.size),
          `Unsupported field width for ${uid}.${field.name}`,
        );
      }
    }
  }
});

test("applies canonical local field metadata", () => {
  const configuration = applyAdminContentManagerPreset(
    "api::products-page.products-page",
    {
      layouts: {
        edit: [[{ name: "intro", size: 12 }]],
        list: ["id", "intro"],
      },
      settings: {},
      metadatas: {
        intro: {
          edit: { label: "Вступление", editable: true },
          list: { label: "Вступление", searchable: true, sortable: true },
        },
      },
    },
  );

  assert.deepEqual(configuration.metadatas.intro?.list, {
    label: "Вступление",
    searchable: false,
    sortable: false,
  });
});

test("syncs Russian labels for content types and components", async () => {
  const updates: Array<{
    kind: "content-type" | "component";
    uid: string;
    configuration: {
      settings: Record<string, unknown>;
      metadatas: Record<string, { edit: { label?: string } }>;
    };
  }> = [];
  const configuration = (field: string) => ({
    layouts: { edit: [[{ name: field, size: 6 }]], list: [field] },
    settings: {},
    metadatas: {
      [field]: {
        edit: { label: field, visible: true, editable: true },
        list: { label: field, searchable: true, sortable: true },
      },
    },
  });
  const services = {
    "content-types": {
      findConfiguration: async () => configuration("brandName"),
      updateConfiguration: async (
        schema: { uid: string; kind?: string },
        updated: (typeof updates)[number]["configuration"],
      ) =>
        updates.push({
          kind: "content-type",
          uid: schema.uid,
          configuration: updated,
        }),
    },
    components: {
      findConfiguration: async () => configuration("url"),
      updateConfiguration: async (
        schema: { uid: string },
        updated: (typeof updates)[number]["configuration"],
      ) =>
        updates.push({
          kind: "component",
          uid: schema.uid,
          configuration: updated,
        }),
    },
  };

  await syncAdminContentManager(
    {
      contentTypes: {
        "api::global-setting.global-setting": {
          uid: "api::global-setting.global-setting",
          kind: "singleType",
        },
      },
      components: { "shared.link": { uid: "shared.link" } },
      plugin: () => ({
        service: (name: keyof typeof services) => services[name],
      }),
    },
    russianAdminTranslations,
  );

  assert.equal(updates.length, 2);
  assert.equal(
    updates[0]?.configuration.metadatas.brandName?.edit.label,
    "Название бренда",
  );
  assert.equal(updates[0]?.configuration.settings.mainField, "id");
  assert.equal(
    updates[1]?.configuration.metadatas.url?.edit.label,
    "Адрес ссылки",
  );
});
