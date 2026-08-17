import "server-only";

import { publicMediaOrigin } from "@/server/public-runtime-config";

import { fetchCms } from "./client";
import { fetchCatalogPage } from "./products-query";

export async function getProducts(page = 1) {
  return fetchCatalogPage(fetchCms, publicMediaOrigin(), {
    type: "tovar",
    page,
  });
}

export async function getRituals(page = 1) {
  return fetchCatalogPage(fetchCms, publicMediaOrigin(), {
    type: "nabor",
    page,
  });
}
