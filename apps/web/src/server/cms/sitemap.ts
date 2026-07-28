import "server-only";

import { fetchCms } from "./client";
import {
  mapSitemapProductsPayload,
  type SitemapProduct,
} from "./sitemap-mapper";

export async function getSitemapProducts(): Promise<SitemapProduct[]> {
  const query = new URLSearchParams({
    status: "published",
    "filters[active][$eq]": "true",
    "fields[0]": "slug",
    "fields[1]": "type",
    "fields[2]": "active",
    "fields[3]": "publishedAt",
    "fields[4]": "updatedAt",
    "pagination[pageSize]": "100",
  });
  const payload = await fetchCms(`/api/products?${query}`, {
    tags: ["products"],
  });

  return mapSitemapProductsPayload(payload);
}
