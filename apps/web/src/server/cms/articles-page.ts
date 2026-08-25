import "server-only";

import { publicMediaOrigin } from "@/server/public-runtime-config";

import { fetchCms } from "./client";
import { fetchArticlesPageContent } from "./articles-page-mapper";

export async function getArticlesPage() {
  return fetchArticlesPageContent(fetchCms, publicMediaOrigin());
}
