import "server-only";

import type { ProductSummary } from "@brega-chai/contracts";

import { publicMediaOrigin } from "@/server/public-runtime-config";

import { fetchCms } from "./client";
import { mapProductsPayload } from "./product-mapper";
import { productCatalogRequests } from "./products-query";

export { productCatalogRequests } from "./products-query";

export async function getProducts(): Promise<ProductSummary[]> {
  const payloads = await Promise.all(
    productCatalogRequests().map(({ path, tags }) => fetchCms(path, { tags })),
  );
  const publicBase = publicMediaOrigin();

  return payloads.flatMap((payload) => mapProductsPayload(payload, publicBase));
}
