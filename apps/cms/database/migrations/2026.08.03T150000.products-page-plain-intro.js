"use strict";

const { blocksToPlainText } = require("../catalog-content-helpers.js");

const FALLBACK_INTRO =
  "Исследуйте чай через происхождение, аромат и собственный ритм заваривания.";

async function migrateIntro(knex) {
  const tableName = "products_pages";
  const legacyColumn = "intro_blocks_legacy";
  if (!(await knex.schema.hasTable(tableName))) return;

  let hasLegacy = await knex.schema.hasColumn(tableName, legacyColumn);
  const hasIntro = await knex.schema.hasColumn(tableName, "intro");
  let sourceColumn = legacyColumn;

  if (!hasLegacy) {
    if (!hasIntro) return;

    const info = await knex(tableName).columnInfo("intro");
    if (
      !String(info.intro?.type ?? "")
        .toLowerCase()
        .includes("json")
    ) {
      sourceColumn = "intro";
    } else {
      await knex.schema.alterTable(tableName, (table) => {
        table.renameColumn("intro", legacyColumn);
      });
      hasLegacy = true;
    }
  }

  if (!(await knex.schema.hasColumn(tableName, "intro"))) {
    await knex.schema.alterTable(tableName, (table) => {
      table.text("intro");
    });
  }

  const rows = await knex(tableName).select("id", sourceColumn);
  for (const row of rows) {
    await knex(tableName)
      .where({ id: row.id })
      .update({
        intro: blocksToPlainText(row[sourceColumn]) || FALLBACK_INTRO,
      });
  }
}

async function removeImageLinks(knex) {
  const linksTable = "products_pages_cmps";
  if (await knex.schema.hasTable(linksTable)) {
    await knex(linksTable).where({ field: "image" }).delete();
  }
}

module.exports = {
  async up(knex) {
    await migrateIntro(knex);
    await removeImageLinks(knex);
  },

  async down() {
    // This content-preserving simplification intentionally has no destructive rollback.
  },
};
