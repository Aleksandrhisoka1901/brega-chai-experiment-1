import "server-only";

import { publicMediaOrigin } from "@/server/public-runtime-config";

import {
  articleDetailRequest,
  articlesListRequest,
  mapArticleDetailPayload,
  mapArticlesPayload,
  type ArticleCard,
  type ArticleDetail,
} from "./article-mapper";
import { fetchCms } from "./client";

export async function getArticles(): Promise<ArticleCard[]> {
  const request = articlesListRequest();
  const payload = await fetchCms(request.path, { tags: [...request.tags] });
  return mapArticlesPayload(payload, publicMediaOrigin());
}

export async function getArticleBySlug(
  slug: string,
): Promise<ArticleDetail | null> {
  const request = articleDetailRequest(slug);
  const payload = await fetchCms(request.path, { tags: [...request.tags] });
  return mapArticleDetailPayload(payload, publicMediaOrigin());
}
