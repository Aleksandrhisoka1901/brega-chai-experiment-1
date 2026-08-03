import {
  assertSlugImmutable,
  generateUniqueSlug,
  shouldGenerateSlug,
  transliterateCatalogTitle,
} from "./slug.js";

interface ProductEvent {
  params: {
    data: {
      displayName?: string;
      slug?: string;
    };
    where?: Record<string, unknown>;
  };
}

const productQuery = () => strapi.db.query("api::product.product");

export default {
  async beforeCreate(event: ProductEvent) {
    const title = event.params.data.displayName;

    if (!title || !shouldGenerateSlug(event.params.data.slug)) {
      return;
    }

    event.params.data.slug = await generateUniqueSlug({
      title,
      transliterate: transliterateCatalogTitle,
      exists: async (slug) =>
        Boolean(
          await productQuery().findOne({ where: { slug }, select: ["id"] }),
        ),
    });
  },

  async beforeUpdate(event: ProductEvent) {
    if (!event.params.where) {
      return;
    }

    const current = await productQuery().findOne({
      where: event.params.where,
      select: ["slug"],
    });

    if (current?.slug) {
      assertSlugImmutable(current.slug, event.params.data.slug);
    }
  },
};
