"use strict";

module.exports = {
  async up(knex) {
    const tableName = "orders";
    if (
      (await knex.schema.hasTable(tableName)) &&
      !(await knex.schema.hasColumn(tableName, "manager_comment"))
    ) {
      await knex.schema.alterTable(tableName, (table) => {
        table.text("manager_comment");
      });
    }
  },

  async down() {
    // Internal notes are intentionally preserved on rollback.
  },
};
