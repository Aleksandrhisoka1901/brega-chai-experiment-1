export const HOME_PAGE_UID = "api::home-page.home-page";

type DocumentStatus = "draft" | "published";

export const DEFAULT_ARTICLES_PREVIEW = {
  title: "Статьи",
  subtitle:
    "Как выбрать мощность, что потянет станция и зачем держать резерв дома.",
  linkLabel: "Все статьи",
} as const;

export async function ensureHomeArticlesPreview(strapi: any) {
  const documents = strapi.documents(HOME_PAGE_UID);
  const articleDocuments = strapi.documents("api::article.article");
  let featuredIds: string[] | undefined;

  for (const status of ["draft", "published"] satisfies DocumentStatus[]) {
    const homes = await documents.findMany({
      status,
      populate: ["articlesPreview", "featuredArticles"],
    });

    for (const home of homes as Array<{
      documentId: string;
      articlesPreview?: unknown;
    }>) {
      if (home.articlesPreview) continue;

      featuredIds ??= (
        (await articleDocuments.findMany({
          status: "published",
          sort: { priority: "desc" },
          limit: 4,
        })) as Array<{ documentId: string }>
      ).map((article) => article.documentId);

      await documents.update({
        documentId: home.documentId,
        status,
        data: {
          articlesPreview: { ...DEFAULT_ARTICLES_PREVIEW },
          featuredArticles: { set: featuredIds },
        },
      });
    }
  }
}
