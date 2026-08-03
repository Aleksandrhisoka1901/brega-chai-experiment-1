"use strict";

const { transliterate } = require("transliteration");
const {
  buildCatalogRecords,
  CATALOG_STORAGE,
  extractAboutFields,
  migratePublicUrl,
} = require("../catalog-content-helpers.js");

async function addColumn(knex, tableName, columnName, define) {
  if (
    (await knex.schema.hasTable(tableName)) &&
    !(await knex.schema.hasColumn(tableName, columnName))
  ) {
    await knex.schema.alterTable(tableName, (table) => define(table));
  }
}

async function renameColumn(knex, tableName, oldName, newName) {
  if (
    (await knex.schema.hasTable(tableName)) &&
    (await knex.schema.hasColumn(tableName, oldName)) &&
    !(await knex.schema.hasColumn(tableName, newName))
  ) {
    await knex.schema.alterTable(tableName, (table) => {
      table.renameColumn(oldName, newName);
    });
  }
}

async function renameTable(knex, oldName, newName) {
  if (
    (await knex.schema.hasTable(oldName)) &&
    !(await knex.schema.hasTable(newName))
  ) {
    await knex.schema.renameTable(oldName, newName);
  }
}

async function migrateProducts(knex) {
  const tableName = "products";
  if (!(await knex.schema.hasTable(tableName))) return;

  await addColumn(knex, tableName, "breadcrumb_label", (table) =>
    table.string("breadcrumb_label"),
  );
  await addColumn(knex, tableName, "category_label", (table) =>
    table.string("category_label"),
  );

  const rows = await knex(tableName)
    .select("id", "document_id", "title", "type", "category_label")
    .orderBy("id", "asc");
  const records = buildCatalogRecords(rows, (value) =>
    transliterate(value, { replace: { Х: "Kh", х: "kh" } }),
  );

  for (const record of records) {
    await knex(tableName).whereIn("id", record.ids).update({
      slug: record.slug,
      type: record.type,
      category_label: record.categoryLabel,
    });
  }
}

async function migrateHomeComponents(knex) {
  const heroTable = "components_home_heroes";
  await addColumn(knex, heroTable, "eyebrow", (table) =>
    table.string("eyebrow"),
  );
  if (await knex.schema.hasTable(heroTable)) {
    await knex(heroTable)
      .whereNull("eyebrow")
      .update({ eyebrow: "Чай как личная практика" });
  }

  const editorialTable = "components_home_editorial_sections";
  await addColumn(knex, editorialTable, "eyebrow", (table) =>
    table.string("eyebrow"),
  );
  await addColumn(knex, editorialTable, "title", (table) =>
    table.string("title"),
  );
  await addColumn(knex, editorialTable, "text_block_1", (table) =>
    table.text("text_block_1"),
  );
  await addColumn(knex, editorialTable, "text_block_2", (table) =>
    table.text("text_block_2"),
  );
  if (await knex.schema.hasTable(editorialTable)) {
    const hasLegacyText = await knex.schema.hasColumn(editorialTable, "text");
    const rows = await knex(editorialTable).select(
      "id",
      ...(hasLegacyText ? ["text"] : []),
    );
    for (const row of rows) {
      const about = extractAboutFields(row.text);
      await knex(editorialTable).where({ id: row.id }).update({
        eyebrow: "Глава 01 · О проекте",
        title: about.title,
        text_block_1: about.textBlock1,
        text_block_2: about.textBlock2,
      });
    }
  }

  const previewTable = "components_home_catalog_previews";
  await addColumn(knex, previewTable, "eyebrow", (table) =>
    table.string("eyebrow"),
  );
  await addColumn(knex, previewTable, "link_label", (table) =>
    table.string("link_label"),
  );

  const linkTable = "home_pages_cmps";
  if (
    (await knex.schema.hasTable(previewTable)) &&
    (await knex.schema.hasTable(linkTable))
  ) {
    const links = await knex(linkTable)
      .select(CATALOG_STORAGE.homePageComponentIdColumn, "field")
      .where({ component_type: "home.catalog-preview" });
    for (const link of links) {
      const isNabor = ["ritualsPreview", "naboryPreview"].includes(link.field);
      const isTovar = ["productsPreview", "tovaryPreview"].includes(link.field);
      if (!isNabor && !isTovar) continue;

      await knex(previewTable)
        .where({ id: link[CATALOG_STORAGE.homePageComponentIdColumn] })
        .update({
          eyebrow: isNabor ? "Глава 02" : "Глава 03",
          ...(isTovar ? { link_label: "Все сорта" } : {}),
        });
    }

    await knex(linkTable)
      .where({ field: "ritualsPreview" })
      .update({ field: "naboryPreview" });
    await knex(linkTable)
      .where({ field: "productsPreview" })
      .update({ field: "tovaryPreview" });
  }
}

async function migrateProductsPage(knex) {
  const tableName = "products_pages";
  await addColumn(knex, tableName, "eyebrow", (table) =>
    table.string("eyebrow"),
  );
  await addColumn(knex, tableName, "empty_state_text", (table) =>
    table.string("empty_state_text"),
  );
  await addColumn(knex, tableName, "empty_state_link_label", (table) =>
    table.string("empty_state_link_label"),
  );
  if (await knex.schema.hasTable(tableName)) {
    await knex(tableName).whereNull("eyebrow").update({
      eyebrow: "Глава 03",
      empty_state_text: "Сорта скоро появятся.",
      empty_state_link_label: "Вернуться на главную",
    });
  }
}

async function migrateInternalLinks(knex) {
  const tableName = "components_shared_links";
  if (!(await knex.schema.hasTable(tableName))) return;

  const links = await knex(tableName).select("id", "url");
  for (const link of links) {
    const url = migratePublicUrl(link.url);
    if (url) {
      await knex(tableName).where({ id: link.id }).update({ url });
    }
  }
}

module.exports = {
  async up(knex) {
    await migrateProducts(knex);
    await migrateHomeComponents(knex);
    await migrateProductsPage(knex);
    await migrateInternalLinks(knex);

    await renameColumn(
      knex,
      "components_shared_navigation_labels",
      "rituals",
      "nabory",
    );
    await renameColumn(
      knex,
      "components_shared_navigation_labels",
      "products",
      "tovary",
    );
    await renameTable(
      knex,
      CATALOG_STORAGE.featuredNabory.legacy,
      CATALOG_STORAGE.featuredNabory.current,
    );
    await renameTable(
      knex,
      CATALOG_STORAGE.featuredTovary.legacy,
      CATALOG_STORAGE.featuredTovary.current,
    );
  },

  async down() {
    // This pre-production content migration intentionally has no destructive rollback.
  },
};
