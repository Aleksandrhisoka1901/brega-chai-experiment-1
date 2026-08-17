import type { ProductSummary } from "@brega-chai/contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { canonicalUrl, pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbStructuredData } from "@/lib/seo/structured-data";
import { bindShortRussianWords } from "@/lib/typography";
import { CmsUnavailableError } from "@/server/cms/errors";
import { getGlobalSettings } from "@/server/cms/global";
import { getProducts, getRituals } from "@/server/cms/products";
import {
  mapProductsPageLoadResults,
  type ProductsPageContent,
} from "@/server/cms/products-page-mapper";
import { getProductsPage } from "@/server/cms/products-page";
import type { CatalogPage } from "@/server/cms/products-query";
import { getRitualsPage } from "@/server/cms/rituals-page";

import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";
import { CatalogPagination } from "./catalog-pagination";
import { resolveCatalogPage } from "./catalog-pagination-model";
import { JsonLd } from "./json-ld";
import { ProductGrid } from "./product-grid";

export type CatalogLandingRoute = "tovary" | "nabory";
export type CatalogSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

const routeConfig = {
  tovary: {
    content: getProductsPage,
    products: getProducts,
    unavailableTitle: "Каталог временно недоступен",
  },
  nabory: {
    content: getRitualsPage,
    products: getRituals,
    unavailableTitle: "Каталог ритуалов временно недоступен",
  },
} as const;

function assertExpectedCmsError(
  result:
    | PromiseRejectedResult
    | PromiseFulfilledResult<
        ProductsPageContent | ProductSummary[] | CatalogPage
      >,
) {
  if (
    result.status === "rejected" &&
    !(result.reason instanceof CmsUnavailableError)
  ) {
    throw result.reason;
  }
}

async function loadPageModel(route: CatalogLandingRoute, page: number) {
  const config = routeConfig[route];
  const [contentResult, productsResult] = await Promise.allSettled([
    config.content(),
    config.products(page),
  ]);

  assertExpectedCmsError(contentResult);
  assertExpectedCmsError(productsResult);

  return {
    ...mapProductsPageLoadResults(
      contentResult,
      productsResult.status === "fulfilled"
        ? { status: "fulfilled", value: productsResult.value.products }
        : productsResult,
    ),
    catalog:
      productsResult.status === "fulfilled" ? productsResult.value : null,
  };
}

export async function resolveRequestedCatalogPage(
  route: CatalogLandingRoute,
  searchParams: CatalogSearchParams,
) {
  const resolved = resolveCatalogPage((await searchParams).page);
  if (!resolved) notFound();
  if (resolved.redirectToFirstPage) permanentRedirect(`/${route}`);
  return resolved.page;
}

export async function catalogLandingMetadata({
  page,
  route,
}: {
  page: number;
  route: CatalogLandingRoute;
}): Promise<Metadata> {
  const config = routeConfig[route];

  try {
    const [content, settings] = await Promise.all([
      config.content(),
      getGlobalSettings(),
    ]);

    return pageMetadata({
      title: content.seo?.title ?? settings.defaultSeo.title ?? content.title,
      description: content.seo?.description ?? settings.defaultSeo.description,
      imageUrl: content.seo?.imageUrl ?? settings.defaultSeo.imageUrl,
      path: page === 1 ? `/${route}` : `/${route}?page=${page}`,
    });
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;

    return {
      title: config.unavailableTitle,
      robots: { index: false, follow: false },
    };
  }
}

export async function CatalogLandingPage({
  page,
  route,
}: {
  page: number;
  route: CatalogLandingRoute;
}) {
  const [pageModel, settings] = await Promise.all([
    loadPageModel(route, page),
    getGlobalSettings(),
  ]);
  if (pageModel.catalog && page > pageModel.catalog.totalPages) notFound();

  const { content, products, contentUnavailable, productsUnavailable } =
    pageModel;
  const sectionLabel = settings.sectionBreadcrumbs[route];
  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Главная", href: "/" },
    { name: sectionLabel, href: `/${route}` },
  ];

  return (
    <main>
      <JsonLd
        data={breadcrumbStructuredData(
          breadcrumbs.map((item) => ({
            name: item.name,
            url: canonicalUrl(item.href),
          })),
        )}
      />
      <section
        className="catalog-intro content-frame"
        data-content-frame
        data-has-eyebrow={Boolean(content?.eyebrow)}
      >
        <Breadcrumbs items={breadcrumbs} />
        {content?.eyebrow ? (
          <p className="eyebrow">{bindShortRussianWords(content.eyebrow)}</p>
        ) : null}
        {contentUnavailable ? (
          <div className="catalog-intro__state" role="alert">
            <h1>Вступление временно недоступно</h1>
            <p>Пожалуйста, попробуйте обновить страницу немного позже.</p>
          </div>
        ) : content ? (
          <>
            <h1>{bindShortRussianWords(content.title)}</h1>
            <div className="catalog-intro__text">
              <p>{bindShortRussianWords(content.intro)}</p>
            </div>
          </>
        ) : null}
      </section>

      <section
        className="catalog-section content-frame"
        data-content-frame
        aria-label={sectionLabel}
      >
        {productsUnavailable ? (
          <div className="catalog-state" role="alert">
            <p>Каталог временно недоступен.</p>
            <p>Пожалуйста, попробуйте обновить страницу немного позже.</p>
          </div>
        ) : products.length === 0 ? (
          <div className="catalog-state">
            <p>
              {bindShortRussianWords(
                content?.emptyStateText ?? "Товары скоро появятся.",
              )}
            </p>
            <Link href="/">
              {bindShortRussianWords(
                content?.emptyStateLinkLabel ?? "Вернуться на главную",
              )}
            </Link>
          </div>
        ) : (
          <ProductGrid
            brandName={settings.brandName}
            headingLevel={2}
            imagePlaceholder={settings.storefrontTexts.imagePlaceholder}
            outOfStock={settings.storefrontTexts.outOfStock}
            products={products}
          />
        )}
        {pageModel.catalog ? (
          <CatalogPagination
            basePath={`/${route}`}
            currentPage={page}
            totalItems={pageModel.catalog.totalItems}
          />
        ) : null}
      </section>
    </main>
  );
}
