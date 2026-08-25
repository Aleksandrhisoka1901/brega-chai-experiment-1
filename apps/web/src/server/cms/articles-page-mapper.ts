import {
  mapProductsPagePayload,
  type ProductsPageContent,
} from "./products-page-mapper.ts";

export function articlesPageRequest() {
  const query = new URLSearchParams({
    status: "published",
    "fields[0]": "eyebrow",
    "fields[1]": "title",
    "fields[2]": "emptyStateText",
    "fields[3]": "emptyStateLinkLabel",
    "fields[4]": "intro",
    "populate[seo][fields][0]": "title",
    "populate[seo][fields][1]": "description",
    "populate[seo][populate][image][fields][0]": "url",
  });

  return {
    path: `/api/articles-page?${query}`,
    tags: ["articles-page", "articles"],
  } as const;
}

export async function fetchArticlesPageContent(
  fetcher: (path: string, options: { tags: string[] }) => Promise<unknown>,
  publicBase: string,
): Promise<ProductsPageContent> {
  const request = articlesPageRequest();
  const payload = await fetcher(request.path, { tags: [...request.tags] });
  return mapProductsPagePayload(payload, publicBase);
}
