import assert from "node:assert/strict";
import test from "node:test";

import { storyToBlocks } from "../database/product-story-helpers.js";
import storyMigration from "../database/migrations/2026.08.16T120000.product-story-blocks.js";

test("converts existing plain product stories into native Blocks paragraphs", () => {
  assert.deepEqual(storyToBlocks(" Первый абзац.\n\nВторой абзац. "), [
    {
      type: "paragraph",
      children: [{ type: "text", text: "Первый абзац." }],
    },
    {
      type: "paragraph",
      children: [{ type: "text", text: "Второй абзац." }],
    },
  ]);
});

test("leaves already migrated Blocks unchanged and handles empty legacy data", () => {
  const blocks = [
    {
      type: "heading",
      level: 2,
      children: [{ type: "text", text: "История" }],
    },
  ];

  assert.deepEqual(storyToBlocks(blocks), blocks);
  assert.deepEqual(storyToBlocks("   "), []);
  assert.deepEqual(storyToBlocks(null), []);
});

type Column = { type: string };
type Row = Record<string, unknown>;

function createFakeKnex(initialRows: Row[]) {
  const columns = new Map<string, Column>([
    ["id", { type: "integer" }],
    ["story", { type: "text" }],
  ]);
  const rows = initialRows.map((row) => ({ ...row }));
  const operations = { renamed: 0, added: 0 };

  const query = (tableName: string) => {
    assert.equal(tableName, "products");
    let where: Row | undefined;
    return {
      async columnInfo(columnName: string) {
        return { [columnName]: columns.get(columnName) };
      },
      async select(...names: string[]) {
        return rows.map((row) =>
          Object.fromEntries(names.map((name) => [name, row[name]])),
        );
      },
      where(criteria: Row) {
        where = criteria;
        return this;
      },
      async update(data: Row) {
        for (const row of rows) {
          if (
            Object.entries(where ?? {}).every(
              ([key, value]) => row[key] === value,
            )
          ) {
            Object.assign(row, data);
          }
        }
      },
    };
  };

  query.schema = {
    async hasTable(tableName: string) {
      return tableName === "products";
    },
    async hasColumn(tableName: string, columnName: string) {
      return tableName === "products" && columns.has(columnName);
    },
    async alterTable(
      tableName: string,
      callback: (table: {
        renameColumn(from: string, to: string): void;
        jsonb(name: string): void;
      }) => void,
    ) {
      assert.equal(tableName, "products");
      callback({
        renameColumn(from, to) {
          const column = columns.get(from);
          assert.ok(column);
          columns.delete(from);
          columns.set(to, column);
          for (const row of rows) {
            row[to] = row[from];
            delete row[from];
          }
          operations.renamed += 1;
        },
        jsonb(name) {
          columns.set(name, { type: "jsonb" });
          for (const row of rows) row[name] = null;
          operations.added += 1;
        },
      });
    },
  };

  return { knex: query, columns, rows, operations };
}

test("actual story migration renames, adds, backfills, and reruns idempotently", async () => {
  const fake = createFakeKnex([
    { id: 1, story: "Первый абзац.\n\nВторой абзац." },
    { id: 2, story: "   " },
  ]);

  await storyMigration.up(fake.knex);
  const firstState = structuredClone(fake.rows);

  assert.deepEqual(
    [...fake.columns],
    [
      ["id", { type: "integer" }],
      ["story_text_legacy", { type: "text" }],
      ["story", { type: "jsonb" }],
    ],
  );
  assert.equal(fake.operations.renamed, 1);
  assert.equal(fake.operations.added, 1);
  assert.deepEqual(JSON.parse(String(fake.rows[0]?.story)), [
    {
      type: "paragraph",
      children: [{ type: "text", text: "Первый абзац." }],
    },
    {
      type: "paragraph",
      children: [{ type: "text", text: "Второй абзац." }],
    },
  ]);
  assert.deepEqual(JSON.parse(String(fake.rows[1]?.story)), []);

  await storyMigration.up(fake.knex);

  assert.deepEqual(fake.rows, firstState);
  assert.equal(fake.operations.renamed, 1);
  assert.equal(fake.operations.added, 1);
});
