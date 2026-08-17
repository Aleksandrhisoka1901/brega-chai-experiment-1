import Link from "next/link";

import {
  catalogPageHref,
  catalogPaginationModel,
} from "./catalog-pagination-model";

export function CatalogPagination({
  basePath,
  currentPage,
  totalItems,
}: {
  basePath: string;
  currentPage: number;
  totalItems: number;
}) {
  const model = catalogPaginationModel(totalItems, currentPage);
  if (model.totalPages === 1) return null;

  return (
    <nav className="catalog-pagination" aria-label="Пагинация каталога">
      {model.previousPage ? (
        <Link href={catalogPageHref(basePath, model.previousPage)}>Назад</Link>
      ) : (
        <span aria-disabled="true">Назад</span>
      )}

      <ol>
        {model.pages.map((page) => (
          <li key={page}>
            {page === model.currentPage ? (
              <span aria-current="page">{page}</span>
            ) : (
              <Link
                aria-label={`Страница ${page}`}
                href={catalogPageHref(basePath, page)}
              >
                {page}
              </Link>
            )}
          </li>
        ))}
      </ol>

      {model.nextPage ? (
        <Link href={catalogPageHref(basePath, model.nextPage)}>Вперёд</Link>
      ) : (
        <span aria-disabled="true">Вперёд</span>
      )}
    </nav>
  );
}
