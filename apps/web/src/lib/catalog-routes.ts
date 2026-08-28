export const CATALOG_COLLECTION_PATH = {
  tovar: "stantsii",
  nabor: "paneli",
} as const;

export type ProductCatalogType = keyof typeof CATALOG_COLLECTION_PATH;
export type CatalogCollectionRoute =
  (typeof CATALOG_COLLECTION_PATH)[ProductCatalogType];

export function catalogCollectionPath(type: ProductCatalogType) {
  return `/${CATALOG_COLLECTION_PATH[type]}`;
}

export function catalogItemPath(type: ProductCatalogType, slug: string) {
  return `${catalogCollectionPath(type)}/${slug}`;
}

export function catalogTypeFromRoute(
  route: CatalogCollectionRoute,
): ProductCatalogType {
  return route === "paneli" ? "nabor" : "tovar";
}

export function catalogRouteFromType(
  type: ProductCatalogType,
): CatalogCollectionRoute {
  return CATALOG_COLLECTION_PATH[type];
}
