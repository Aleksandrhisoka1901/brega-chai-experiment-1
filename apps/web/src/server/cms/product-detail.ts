import "server-only";

import { publicMediaOrigin } from "@/server/public-runtime-config";

import { fetchCms } from "./client";
import {
  mapProductDetailPayload,
  type ProductDetail,
} from "./product-detail-mapper";
import { productDetailRequest } from "./product-detail-query";

export async function getProductBySlug(
  type: "tovar" | "nabor",
  slug: string,
): Promise<ProductDetail | null> {
  const request = productDetailRequest(type, slug);
  const payload = await fetchCms(request.path, { tags: request.tags });
  const publicBase = publicMediaOrigin();

  return mapProductDetailPayload(payload, publicBase);
}
