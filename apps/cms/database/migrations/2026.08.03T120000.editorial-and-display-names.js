"use strict";

const {
  productDisplayName,
  technicalProductTitle,
} = require("../catalog-content-helpers.js");

async function migrateProductNames(knex) {
  const tableName = "products";
  if (!(await knex.schema.hasTable(tableName))) return;

  if (!(await knex.schema.hasColumn(tableName, "display_name"))) {
    await knex.schema.alterTable(tableName, (table) => {
      table.string("display_name");
    });
  }

  const rows = await knex(tableName).select(
    "id",
    "title",
    "display_name",
    "type",
  );
  for (const row of rows) {
    const displayName =
      productDisplayName(row.display_name) || productDisplayName(row.title);
    await knex(tableName).where({ id: row.id }).update({
      display_name: displayName,
      title: technicalProductTitle(displayName, row.type),
    });
  }
}

async function migrateRitualsPreview(knex) {
  const sourceTable = "components_home_catalog_previews";
  const targetTable = "components_home_rituals_previews";
  const linksTable = "home_pages_cmps";
  if (
    !(await knex.schema.hasTable(sourceTable)) ||
    !(await knex.schema.hasTable(linksTable))
  ) {
    return;
  }

  if (!(await knex.schema.hasTable(targetTable))) {
    await knex.schema.createTable(targetTable, (table) => {
      table.increments("id").primary();
      table.string("eyebrow");
      table.string("title");
      table.text("subtitle");
    });
  }

  const links = await knex(linksTable)
    .select("id", "cmp_id")
    .where({
      component_type: "home.catalog-preview",
      field: "naboryPreview",
    });
  for (const link of links) {
    const preview = await knex(sourceTable).where({ id: link.cmp_id }).first();
    if (!preview) continue;

    const [created] = await knex(targetTable)
      .insert({
        eyebrow: preview.eyebrow,
        title: preview.title,
        subtitle: preview.subtitle,
      })
      .returning("id");
    const componentId =
      typeof created === "object" && created ? created.id : created;
    await knex(linksTable).where({ id: link.id }).update({
      cmp_id: componentId,
      component_type: "home.rituals-preview",
    });
  }
}

async function simplifyEditorialComponents(knex) {
  if (await knex.schema.hasTable("components_home_heroes")) {
    await knex("components_home_heroes").update({
      background_color: null,
      text_color: null,
    });
  }

  const linksTable = "components_home_editorial_sections_cmps";
  if (await knex.schema.hasTable(linksTable)) {
    await knex(linksTable).where({ field: "image" }).delete();
  }
}

module.exports = {
  async up(knex) {
    await migrateProductNames(knex);
    await migrateRitualsPreview(knex);
    await simplifyEditorialComponents(knex);
  },

  async down() {
    // Content cleanup and field separation intentionally have no destructive rollback.
  },
};
