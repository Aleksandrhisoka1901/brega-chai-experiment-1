"use strict";

const { blocksToPlainText } = require("../catalog-content-helpers.js");

const FALLBACK_INTRO =
  "Исследуйте чай через происхождение, аромат и собственный ритм заваривания.";

module.exports = {
  async up(knex) {
    const tableName = "products_pages";
    if (
      !(await knex.schema.hasTable(tableName)) ||
      !(await knex.schema.hasColumn(tableName, "intro"))
    ) {
      return;
    }

    const rows = await knex(tableName).select("id", "intro");
    for (const row of rows) {
      await knex(tableName)
        .where({ id: row.id })
        .update({ intro: blocksToPlainText(row.intro) || FALLBACK_INTRO });
    }
  },

  async down() {
    // Plain text normalization intentionally has no destructive rollback.
  },
};
