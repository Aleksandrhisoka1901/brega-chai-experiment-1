import "server-only";

import { publicMediaOrigin } from "@/server/public-runtime-config";

import { fetchCms } from "./client";
import { fetchCatalogPage, type CatalogPriceFilter } from "./products-query";

export async function getProducts(
  page = 1,
  priceFilter: CatalogPriceFilter = {},
) {
  return fetchCatalogPage(fetchCms, publicMediaOrigin(), {
    type: "tovar",
    page,
    ...priceFilter,
  });
}

export async function getRituals(
  page = 1,
  priceFilter: CatalogPriceFilter = {},
) {
  return fetchCatalogPage(fetchCms, publicMediaOrigin(), {
    type: "nabor",
    page,
    ...priceFilter,
  });
}
