import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

type ProductRow = {
  id: number;
  documentId: string;
  displayName: string;
  publishedAt: string | null;
  slug: string;
  slugLocked?: boolean;
};

async function loadLifecycle() {
  const productDirectory = new URL(
    "../src/api/product/content-types/product/",
    import.meta.url,
  );
  const [slugSource, lifecycleSource] = await Promise.all([
    readFile(new URL("slug.ts", productDirectory), "utf8"),
    readFile(new URL("lifecycles.ts", productDirectory), "utf8"),
  ]);
  const slugJavaScript = ts.transpileModule(
    slugSource.replace(
      '"transliteration"',
      JSON.stringify(import.meta.resolve("transliteration")),
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const slugUrl = `data:text/javascript;base64,${Buffer.from(slugJavaScript).toString("base64")}`;
  const lifecycleJavaScript = ts.transpileModule(
    lifecycleSource.replace('"./slug.js"', JSON.stringify(slugUrl)),
    {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;

  return import(
    `data:text/javascript;base64,${Buffer.from(lifecycleJavaScript).toString("base64")}`
  ).then((module) => module.default);
}

test("create generates a server-owned slug when the form omits it", async () => {
  (globalThis as { strapi?: unknown }).strapi = {
    db: {
      query: () => ({ findOne: async () => null }),
    },
  };

  const lifecycle = await loadLifecycle();
  const event = {
    params: {
      data: {
        displayName: "Да Хун Пао",
      },
    },
  };

  await lifecycle.beforeCreate(event);

  assert.equal(event.params.data.slug, "da-khun-pao");
  delete (globalThis as { strapi?: unknown }).strapi;
});

test("slug remains locked after publish, unpublish, and draft edit", async () => {
  const rows: ProductRow[] = [
    {
      id: 1,
      documentId: "document-1",
      displayName: "Утро без слов",
      publishedAt: null,
      slug: "utro-bez-slov",
      slugLocked: false,
    },
  ];

  const findOne = async ({ where }: { where: Record<string, unknown> }) =>
    rows.find((row) =>
      Object.entries(where).every(([key, value]) => {
        if (key === "publishedAt" && typeof value === "object") {
          return row.publishedAt != null;
        }
        return row[key as keyof ProductRow] === value;
      }),
    ) ?? null;
  const queryBuilder = () => {
    let where: Record<string, unknown> = {};
    let update: Record<string, unknown> = {};
    return {
      where(criteria: Record<string, unknown>) {
        where = criteria;
        return this;
      },
      update(data: Record<string, unknown>) {
        update = data;
        return this;
      },
      async execute() {
        for (const row of rows) {
          if (
            Object.entries(where).every(
              ([key, value]) => row[key as keyof ProductRow] === value,
            )
          ) {
            if ("slug_locked" in update) {
              row.slugLocked = Boolean(update.slug_locked);
            }
          }
        }
      },
    };
  };
  (globalThis as { strapi?: unknown }).strapi = {
    db: {
      query: () => ({ findOne }),
      queryBuilder,
      metadata: {
        get: () => ({
          attributes: { slugLocked: { columnName: "slug_locked" } },
        }),
      },
    },
  };

  const lifecycle = await loadLifecycle();
  const publishedData = {
    ...rows[0],
    id: undefined,
    publishedAt: "2026-08-16T12:00:00.000Z",
  };
  const publishEvent = { params: { data: publishedData } };
  await lifecycle.beforeCreate(publishEvent);
  rows.push({ ...publishedData, id: 2 } as ProductRow);

  assert.equal(rows[0]?.slugLocked, true);
  assert.equal(publishedData.slugLocked, true);

  const unpublishEvent = { params: { where: { id: 2 } } };
  assert.equal(typeof lifecycle.beforeDelete, "function");
  await lifecycle.beforeDelete(unpublishEvent);
  rows.splice(1, 1);

  const editEvent = {
    params: {
      where: { id: 1 },
      data: { displayName: "Тихое утро" } as {
        displayName: string;
        slug?: string;
      },
    },
  };
  await lifecycle.beforeUpdate(editEvent);
  assert.equal(editEvent.params.data.slug, undefined);

  await assert.rejects(
    lifecycle.beforeUpdate({
      params: {
        where: { id: 1 },
        data: { slug: "tikhoye-utro" },
      },
    }),
    /cannot be changed after publication/,
  );

  delete (globalThis as { strapi?: unknown }).strapi;
});
