import "server-only";

import { publicMediaOrigin } from "@/server/public-runtime-config";

import { fetchCms } from "./client";
import {
  mapProductDetailPayload,
  type ProductDetail,
} from "./product-detail-mapper";

export async function getProductBySlug(
  type: "tovar" | "nabor",
  slug: string,
): Promise<ProductDetail | null> {
  const query = new URLSearchParams({
    status: "published",
    "filters[type][$eq]": type,
    "filters[slug][$eq]": slug,
    "fields[0]": "displayName",
    "fields[1]": "slug",
    "fields[2]": "type",
    "fields[3]": "originalTitle",
    "fields[4]": "packageLabel",
    "fields[5]": "price",
    "fields[6]": "currency",
    "fields[7]": "stock",
    "fields[8]": "cardExcerpt",
    "fields[9]": "story",
    "fields[10]": "breadcrumbLabel",
    "fields[11]": "categoryLabel",
    "populate[seo][fields][0]": "title",
    "populate[seo][fields][1]": "description",
    "populate[seo][populate][image][fields][0]": "url",
    "populate[mainImage][populate][image][fields][0]": "url",
    "populate[mainImage][populate][image][fields][1]": "width",
    "populate[mainImage][populate][image][fields][2]": "height",
    "populate[mainImage][populate][image][fields][3]": "formats",
    "populate[gallery][populate][image][fields][0]": "url",
    "populate[gallery][populate][image][fields][1]": "width",
    "populate[gallery][populate][image][fields][2]": "height",
    "populate[gallery][populate][image][fields][3]": "formats",
    "populate[articles][fields][0]": "content",
    "pagination[pageSize]": "1",
  });
  const payload = await fetchCms(`/api/products?${query}`, {
    tags: ["products", `product-slug:${type}:${slug}`],
  });
  const publicBase = publicMediaOrigin();

  return mapProductDetailPayload(payload, publicBase);
}
