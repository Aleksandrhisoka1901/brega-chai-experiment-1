"use strict";

const {
  GALLERY_COMPONENT_TYPE,
  MAIN_IMAGE_COMPONENT_TYPE,
  TARGET_SEED_KEY,
  planProductMainImageCopies,
} = require("../product-main-image-helpers.js");

const TABLES = {
  products: "products",
  componentLinks: "products_cmps",
  galleryImages: "components_product_gallery_images",
  mainImages: "components_shared_images_with_alt",
  fileLinks: "files_related_mph",
};

async function hasRequiredTables(knex) {
  const checks = await Promise.all(
    Object.values(TABLES).map((table) => knex.schema.hasTable(table)),
  );
  return checks.every(Boolean);
}

async function migrateMainImage(knex) {
  if (!(await hasRequiredTables(knex))) return;

  await knex.transaction(async (transaction) => {
    const products = await transaction(TABLES.products)
      .select("id", "seed_key")
      .where({ seed_key: TARGET_SEED_KEY });
    if (products.length === 0) return;

    const productIds = products.map((product) => product.id);
    const componentLinks = await transaction(TABLES.componentLinks)
      .select("id", "entity_id", "cmp_id", "component_type", "field", "order")
      .whereIn("entity_id", productIds)
      .whereIn("field", ["mainImage", "gallery"]);
    const galleryIds = componentLinks
      .filter(
        (link) =>
          link.field === "gallery" &&
          link.component_type === GALLERY_COMPONENT_TYPE,
      )
      .map((link) => link.cmp_id);
    if (galleryIds.length === 0) return;

    const [galleryImages, fileLinks] = await Promise.all([
      transaction(TABLES.galleryImages)
        .select("id", "alt")
        .whereIn("id", galleryIds),
      transaction(TABLES.fileLinks)
        .select("file_id", "related_id", "related_type", "field", "order")
        .whereIn("related_id", galleryIds)
        .where({ related_type: GALLERY_COMPONENT_TYPE, field: "image" }),
    ]);

    const copies = planProductMainImageCopies({
      products,
      componentLinks,
      galleryImages,
      fileLinks,
    });

    for (const copy of copies) {
      const [created] = await transaction(TABLES.mainImages)
        .insert({ alt: copy.alt })
        .returning("id");
      const componentId =
        typeof created === "object" && created ? created.id : created;

      await transaction(TABLES.fileLinks).insert({
        file_id: copy.fileId,
        related_id: componentId,
        related_type: MAIN_IMAGE_COMPONENT_TYPE,
        field: "image",
        order: copy.fileOrder,
      });
      await transaction(TABLES.componentLinks).insert({
        entity_id: copy.productId,
        cmp_id: componentId,
        component_type: MAIN_IMAGE_COMPONENT_TYPE,
        field: "mainImage",
        order: null,
      });
    }
  });
}

module.exports = {
  async up(knex) {
    await migrateMainImage(knex);
  },

  async down() {
    // The migration only fills missing content and has no destructive rollback.
  },
};
