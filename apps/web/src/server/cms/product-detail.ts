import "server-only";

import { fetchCms } from "./client";
import {
  mapProductDetailPayload,
  type ProductDetail,
} from "./product-detail-mapper";

export async function getProductBySlug(
  type: "product" | "ritual",
  slug: string,
): Promise<ProductDetail | null> {
  const query = new URLSearchParams({
    status: "published",
    "filters[type][$eq]": type,
    "filters[slug][$eq]": slug,
    "filters[active][$eq]": "true",
    "fields[0]": "title",
    "fields[1]": "slug",
    "fields[2]": "type",
    "fields[3]": "originalTitle",
    "fields[4]": "packageLabel",
    "fields[5]": "price",
    "fields[6]": "currency",
    "fields[7]": "stock",
    "fields[8]": "cardExcerpt",
    "fields[9]": "story",
    "fields[10]": "articleContent",
    "populate[mainImage][populate][image][fields][0]": "url",
    "populate[mainImage][populate][image][fields][1]": "width",
    "populate[mainImage][populate][image][fields][2]": "height",
    "populate[gallery][populate][image][fields][0]": "url",
    "populate[gallery][populate][image][fields][1]": "width",
    "populate[gallery][populate][image][fields][2]": "height",
    "pagination[pageSize]": "1",
  });
  const payload = await fetchCms(`/api/products?${query}`, {
    tags: ["products", `product-slug:${type}:${slug}`],
  });
  const publicBase =
    process.env.NEXT_PUBLIC_MEDIA_URL ??
    process.env.NEXT_PUBLIC_CMS_URL ??
    "http://localhost:1337";

  return mapProductDetailPayload(payload, publicBase);
}
