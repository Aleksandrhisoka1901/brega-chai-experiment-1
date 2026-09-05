import {
  generateUniqueSlug,
  isValidAsciiSlug,
  transliterateCatalogTitle,
} from "./api/product/content-types/product/slug.js";

export const ARTICLE_UID = "api::article.article";

type ArticleRow = {
  id: number;
  documentId?: string | null;
  name?: string | null;
  slug?: string | null;
};

export async function repairNonAsciiArticleSlugs(strapi: {
  db: {
    query: (uid: string) => {
      findMany: (params: {
        select: string[];
      }) => Promise<ArticleRow[]>;
    };
    queryBuilder: (uid: string) => {
      where: (criteria: Record<string, unknown>) => {
        update: (data: Record<string, unknown>) => {
          execute: () => Promise<unknown>;
        };
      };
    };
  };
}) {
  const rows = await strapi.db.query(ARTICLE_UID).findMany({
    select: ["id", "documentId", "name", "slug"],
  });

  const grouped = new Map<string, ArticleRow[]>();
  for (const row of rows) {
    const key = row.documentId ? `doc:${row.documentId}` : `id:${row.id}`;
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }

  for (const group of grouped.values()) {
    if (group.every((row) => isValidAsciiSlug(row.slug))) continue;
    const title = group.find((row) => row.name?.trim())?.name;
    if (!title) continue;

    const slug = await generateUniqueSlug({
      title,
      transliterate: transliterateCatalogTitle,
      exists: async (candidate) =>
        rows.some(
          (row) =>
            row.slug === candidate &&
            !group.some((member) => member.id === row.id),
        ),
    });

    for (const row of group) {
      await strapi.db
        .queryBuilder(ARTICLE_UID)
        .where({ id: row.id })
        .update({ slug })
        .execute();
      row.slug = slug;
    }
  }
}
