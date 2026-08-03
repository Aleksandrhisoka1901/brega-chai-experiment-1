import "server-only";

import { publicMediaOrigin } from "@/server/public-runtime-config";

import { fetchCms } from "./client";
import {
  fetchProductsPageContent,
  type ProductsPageContent,
} from "./products-page-mapper";

export async function getProductsPage(): Promise<ProductsPageContent> {
  const publicBase = publicMediaOrigin();

  return fetchProductsPageContent(fetchCms, publicBase);
}
