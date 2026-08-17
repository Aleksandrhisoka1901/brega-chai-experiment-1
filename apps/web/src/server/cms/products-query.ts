import type { ProductSummary } from "@brega-chai/contracts";

import { CATALOG_PAGE_SIZE } from "../../components/catalog-pagination-model.ts";

import { mapCatalogProductsPayload } from "./product-mapper.ts";

const productFields = {
  "fields[0]": "displayName",
  "fields[1]": "slug",
  "fields[2]": "type",
  "fields[3]": "packageLabel",
  "fields[4]": "price",
  "fields[5]": "stock",
  "fields[6]": "cardExcerpt",
  "populate[mainImage][populate][image][fields][0]": "url",
  "populate[mainImage][populate][image][fields][1]": "alternativeText",
  "populate[mainImage][populate][image][fields][2]": "formats",
  "populate[mainImage][populate][image][fields][3]": "width",
  "populate[mainImage][populate][image][fields][4]": "height",
  "populate[mainImage][populate][image][fields][5]": "updatedAt",
};

type CatalogGroup = "available" | "unavailable";
type CatalogType = "tovar" | "nabor";

export type CatalogPage = {
  products: ProductSummary[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export function catalogGroupRequest({
  type,
  availability,
  start,
  limit,
}: {
  type: CatalogType;
  availability: CatalogGroup;
  start: number;
  limit: number;
}) {
  const query = new URLSearchParams({
    status: "published",
    "filters[type][$eq]": type,
    "sort[0]": "displayName:asc",
    "sort[1]": "slug:asc",
    ...productFields,
    "pagination[start]": String(start),
    "pagination[limit]": String(limit),
    "pagination[withCount]": "true",
  });
  query.set(
    availability === "available"
      ? "filters[stock][$gt]"
      : "filters[stock][$eq]",
    "0",
  );

  return { path: `/api/products?${query}`, tags: ["products"] } as const;
}

export async function fetchCatalogPage(
  fetcher: (path: string, options: { tags: string[] }) => Promise<unknown>,
  publicBase: string,
  {
    type,
    page,
    pageSize = CATALOG_PAGE_SIZE,
  }: { type: CatalogType; page: number; pageSize?: number },
): Promise<CatalogPage> {
  const offset = (page - 1) * pageSize;
  const availableRequest = catalogGroupRequest({
    type,
    availability: "available",
    start: offset,
    limit: pageSize,
  });
  const availablePayload = await fetcher(availableRequest.path, {
    tags: [...availableRequest.tags],
  });
  const available = mapCatalogProductsPayload(availablePayload, publicBase);
  const remaining = Math.max(0, pageSize - available.products.length);
  const unavailableRequest = catalogGroupRequest({
    type,
    availability: "unavailable",
    start: Math.max(0, offset - available.totalItems),
    limit: Math.max(1, remaining),
  });
  const unavailablePayload = await fetcher(unavailableRequest.path, {
    tags: [...unavailableRequest.tags],
  });
  const unavailable = mapCatalogProductsPayload(unavailablePayload, publicBase);
  const totalItems = available.totalItems + unavailable.totalItems;

  return {
    products: [
      ...available.products,
      ...(remaining > 0 ? unavailable.products.slice(0, remaining) : []),
    ],
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}
