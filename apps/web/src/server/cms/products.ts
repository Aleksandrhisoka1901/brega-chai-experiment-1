import "server-only";

import type { ProductSummary } from "@brega-chai/contracts";

import { fetchCms } from "./client";
import { mapProductsPayload } from "./product-mapper";

export async function getProducts(): Promise<ProductSummary[]> {
  const query = new URLSearchParams({
    status: "published",
    "filters[type][$eq]": "product",
    "filters[active][$eq]": "true",
    "sort[0]": "sortOrder:asc",
    "fields[0]": "title",
    "fields[1]": "slug",
    "fields[2]": "type",
    "fields[3]": "packageLabel",
    "fields[4]": "price",
    "fields[5]": "stock",
    "fields[6]": "cardExcerpt",
    "populate[mainImage][populate][image][fields][0]": "url",
    "populate[mainImage][populate][image][fields][1]": "alternativeText",
    "pagination[pageSize]": "100",
  });
  const payload = await fetchCms(`/api/products?${query}`, {
    tags: ["products"],
  });
  const publicBase =
    process.env.NEXT_PUBLIC_MEDIA_URL ??
    process.env.NEXT_PUBLIC_CMS_URL ??
    "http://localhost:1337";

  return mapProductsPayload(payload, publicBase);
}
