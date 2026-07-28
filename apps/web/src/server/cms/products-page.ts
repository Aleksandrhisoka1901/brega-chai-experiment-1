import "server-only";

import { fetchCms } from "./client";
import {
  fetchProductsPageContent,
  type ProductsPageContent,
} from "./products-page-mapper";

export async function getProductsPage(): Promise<ProductsPageContent> {
  const publicBase =
    process.env.NEXT_PUBLIC_MEDIA_URL ??
    process.env.NEXT_PUBLIC_CMS_URL ??
    "http://localhost:1337";

  return fetchProductsPageContent(fetchCms, publicBase);
}
