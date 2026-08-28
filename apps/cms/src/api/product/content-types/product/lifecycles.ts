import {
  assertSlugImmutable,
  generateUniqueSlug,
  shouldRegenerateDraftSlug,
  shouldGenerateSlug,
  transliterateCatalogTitle,
} from "./slug.js";

interface ProductEvent {
  params: {
    data: {
      documentId?: string;
      displayName?: string;
      publishedAt?: Date | string | null;
      slug?: string;
      slugLocked?: boolean;
      type?: "nabor" | "tovar";
      catalogRoute?: "stantsii" | "paneli";
    };
    where?: Record<string, unknown>;
  };
}

interface ProductDeleteEvent {
  params: {
    where?: Record<string, unknown>;
  };
}

const PRODUCT_UID = "api::product.product";
const productQuery = () => strapi.db.query(PRODUCT_UID);

function catalogRouteFromType(type?: "nabor" | "tovar") {
  return type === "nabor" ? "paneli" : "stantsii";
}

function assignCatalogRoute(
  data: ProductEvent["params"]["data"],
  type?: "nabor" | "tovar",
) {
  const nextType = data.type ?? type;
  if (nextType === "nabor" || nextType === "tovar") {
    data.catalogRoute = catalogRouteFromType(nextType);
  }
}

async function persistSlugLock(documentId: string) {
  // The low-level builder participates in Strapi's current transaction and
  // deliberately bypasses entity lifecycle hooks, avoiding recursive updates.
  await strapi.db
    .queryBuilder(PRODUCT_UID)
    .where({ documentId })
    .update({ slug_locked: true })
    .execute();
}

export default {
  async beforeCreate(event: ProductEvent) {
    const data = event.params.data;
    assignCatalogRoute(data);
    if (data.publishedAt != null) {
      data.slugLocked = true;
      if (data.documentId) {
        await persistSlugLock(data.documentId);
      }
    } else {
      delete data.slugLocked;
    }

    const title = data.displayName;

    if (!title || !shouldGenerateSlug(data.slug)) {
      return;
    }

    data.slug = await generateUniqueSlug({
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
      select: [
        "id",
        "documentId",
        "displayName",
        "publishedAt",
        "slug",
        "slugLocked",
        "type",
      ],
    });

    assignCatalogRoute(event.params.data, current?.type);

    if (!current?.slug || !current.displayName) {
      return;
    }

    const hasPublishedVersion =
      current.slugLocked === true ||
      current.publishedAt != null ||
      Boolean(
        current.documentId &&
          (await productQuery().findOne({
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

    const nextDisplayName = event.params.data.displayName;
    if (
      typeof nextDisplayName === "string" &&
      shouldRegenerateDraftSlug({
        currentDisplayName: current.displayName,
        nextDisplayName,
        hasPublishedVersion,
      })
    ) {
      event.params.data.slug = await generateUniqueSlug({
        title: nextDisplayName,
        transliterate: transliterateCatalogTitle,
        exists: async (slug) => {
          const matching = await productQuery().findOne({
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

  async beforeDelete(event: ProductDeleteEvent) {
    if (!event.params.where) {
      return;
    }

    const current = await productQuery().findOne({
      where: event.params.where,
      select: ["documentId", "publishedAt"],
    });

    if (current?.documentId && current.publishedAt != null) {
      await persistSlugLock(current.documentId);
    }
  },
};
