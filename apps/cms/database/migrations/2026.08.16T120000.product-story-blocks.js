"use strict";

const { storyToBlocks } = require("../product-story-helpers.js");

module.exports = {
  async up(knex) {
    const tableName = "products";
    const legacyColumn = "story_text_legacy";
    if (!(await knex.schema.hasTable(tableName))) return;
    const hasStory = await knex.schema.hasColumn(tableName, "story");
    const hasLegacy = await knex.schema.hasColumn(tableName, legacyColumn);
    if (!hasStory && !hasLegacy) return;

    if (!hasLegacy) {
      const info = await knex(tableName).columnInfo("story");
      const storyType = String(info.story?.type ?? "").toLowerCase();
      if (storyType.includes("json")) return;

      await knex.schema.alterTable(tableName, (table) => {
        table.renameColumn("story", legacyColumn);
      });
    }

    if (!(await knex.schema.hasColumn(tableName, "story"))) {
      await knex.schema.alterTable(tableName, (table) => {
        table.jsonb("story");
      });
    }

    const rows = await knex(tableName).select("id", legacyColumn);
    for (const row of rows) {
      await knex(tableName)
        .where({ id: row.id })
        .update({ story: JSON.stringify(storyToBlocks(row[legacyColumn])) });
    }
  },

  async down() {
    // The original text remains in story_text_legacy; rollback is intentionally non-destructive.
  },
};
