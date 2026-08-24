type QueryParam = string | string[] | undefined;

export type CatalogPriceFilter = {
  minPrice?: number;
  maxPrice?: number;
};

const PRICE_PATTERN = /^[1-9]\d*$/;

export function parseCatalogPriceInput(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  if (!PRICE_PATTERN.test(trimmed)) return null;

  const price = Number(trimmed);
  return Number.isSafeInteger(price) ? price : null;
}

export function resolveCatalogPriceValue(value: QueryParam) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return null;
  return parseCatalogPriceInput(value) ?? null;
}

export function resolveCatalogPriceFilter(params: {
  minPrice?: QueryParam;
  maxPrice?: QueryParam;
}): CatalogPriceFilter | null {
  const minPrice = resolveCatalogPriceValue(params.minPrice);
  const maxPrice = resolveCatalogPriceValue(params.maxPrice);
  if (minPrice === null || maxPrice === null) return null;

  return {
    ...(minPrice === undefined ? {} : { minPrice }),
    ...(maxPrice === undefined ? {} : { maxPrice }),
  };
}

export function hasCatalogPriceFilter(filter: CatalogPriceFilter) {
  return filter.minPrice != null || filter.maxPrice != null;
}
