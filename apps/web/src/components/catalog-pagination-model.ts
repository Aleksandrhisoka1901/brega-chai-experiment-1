export const CATALOG_PAGE_SIZE = 8;

type PageParam = string | string[] | undefined;

export function resolveCatalogPage(value: PageParam) {
  if (value === undefined) {
    return { page: 1, redirectToFirstPage: false } as const;
  }
  if (Array.isArray(value) || !/^[1-9]\d*$/.test(value)) return null;

  const page = Number(value);
  if (!Number.isSafeInteger(page)) return null;

  return { page, redirectToFirstPage: page === 1 } as const;
}

export function catalogPageHref(basePath: string, page: number) {
  return page === 1 ? basePath : `${basePath}?page=${page}`;
}

export function catalogPaginationModel(
  totalItems: number,
  currentPage: number,
  pageSize = CATALOG_PAGE_SIZE,
) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    currentPage,
    totalPages,
    pages: Array.from({ length: totalPages }, (_, index) => index + 1),
    previousPage: currentPage > 1 ? currentPage - 1 : null,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
  };
}
