import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  configureOrderReadOnlyFields,
  configureProductFields,
} from "../src/admin-content-manager.ts";
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
      ],
      list: ["title", "seedKey"],
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

  assert.deepEqual(configuration.layouts.edit, [[{ name: "title", size: 6 }]]);
  assert.deepEqual(configuration.layouts.list, ["title", "displayName"]);
  assert.deepEqual(configuration.metadatas.seedKey.edit, {
    visible: false,
    editable: false,
  });
  assert.deepEqual(configuration.metadatas.slug.edit, {
    visible: true,
    editable: false,
  });
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
