import { transliterate } from "transliteration";

import { assertSlugImmutable, generateUniqueSlug } from "./slug.js";

interface ProductEvent {
  params: {
    data: {
      title?: string;
      slug?: string;
    };
    where?: Record<string, unknown>;
  };
}

const productQuery = () => strapi.db.query("api::product.product");

export default {
  async beforeCreate(event: ProductEvent) {
    const title = event.params.data.title;

    if (!title) {
      return;
    }

    event.params.data.slug = await generateUniqueSlug({
      title,
      transliterate,
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
