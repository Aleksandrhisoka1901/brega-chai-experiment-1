import {
  assertSlugImmutable,
  generateUniqueSlug,
  shouldRegenerateDraftSlug,
  shouldGenerateSlug,
  transliterateCatalogTitle,
} from "../../../product/content-types/product/slug.js";

interface ArticleEvent {
  params: {
    data: {
      documentId?: string;
      name?: string;
      publishedAt?: Date | string | null;
      slug?: string;
      slugLocked?: boolean;
    };
    where?: Record<string, unknown>;
  };
}

interface ArticleDeleteEvent {
  params: {
    where?: Record<string, unknown>;
  };
}

const ARTICLE_UID = "api::article.article";
const articleQuery = () => strapi.db.query(ARTICLE_UID);

async function persistSlugLock(documentId: string) {
  await strapi.db
    .queryBuilder(ARTICLE_UID)
    .where({ documentId })
    .update({ slug_locked: true })
    .execute();
}

export default {
  async beforeCreate(event: ArticleEvent) {
    const data = event.params.data;
    if (data.publishedAt != null) {
      data.slugLocked = true;
      if (data.documentId) {
        await persistSlugLock(data.documentId);
      }
    } else {
      delete data.slugLocked;
    }

    const title = data.name;

    if (!title || !shouldGenerateSlug(data.slug)) {
      return;
    }

    data.slug = await generateUniqueSlug({
      title,
      transliterate: transliterateCatalogTitle,
      exists: async (slug) =>
        Boolean(
          await articleQuery().findOne({ where: { slug }, select: ["id"] }),
        ),
    });
  },

  async beforeUpdate(event: ArticleEvent) {
    if (!event.params.where) {
      return;
    }

    const current = await articleQuery().findOne({
      where: event.params.where,
      select: [
        "id",
        "documentId",
        "name",
        "publishedAt",
        "slug",
        "slugLocked",
      ],
    });

    if (!current?.slug || !current.name) {
      return;
    }

    const hasPublishedVersion =
      current.slugLocked === true ||
      current.publishedAt != null ||
      Boolean(
        current.documentId &&
          (await articleQuery().findOne({
            where: {
              documentId: current.documentId,
              publishedAt: { $notNull: true },
            },
            select: ["id"],
          })),
      );

    if (hasPublishedVersion) {
      event.params.data.slugLocked = true;
      assertSlugImmutable(current.slug, event.params.data.slug);
      return;
    }

    delete event.params.data.slugLocked;

    const nextName = event.params.data.name;
    if (
      typeof nextName === "string" &&
      shouldRegenerateDraftSlug({
        currentDisplayName: current.name,
        nextDisplayName: nextName,
        hasPublishedVersion,
      })
    ) {
      event.params.data.slug = await generateUniqueSlug({
        title: nextName,
        transliterate: transliterateCatalogTitle,
        exists: async (slug) => {
          const matching = await articleQuery().findOne({
            where: { slug },
            select: ["id", "documentId"],
          });
          return Boolean(
            matching &&
              (current.documentId
                ? matching.documentId !== current.documentId
                : matching.id !== current.id),
          );
        },
      });
    }
  },

  async beforeDelete(event: ArticleDeleteEvent) {
    if (!event.params.where) {
      return;
    }

    const current = await articleQuery().findOne({
      where: event.params.where,
      select: ["documentId", "publishedAt"],
    });

    if (current?.documentId && current.publishedAt != null) {
      await persistSlugLock(current.documentId);
    }
  },
};
