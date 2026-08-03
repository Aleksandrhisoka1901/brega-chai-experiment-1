import type { ProductSummary } from "@brega-chai/contracts";
import type { Metadata } from "next";
import Link from "next/link";

import { ProductGrid } from "@/components/product-grid";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { canonicalUrl } from "@/lib/seo/metadata";
import { breadcrumbStructuredData } from "@/lib/seo/structured-data";
import { CmsUnavailableError } from "@/server/cms/errors";
import { getProducts } from "@/server/cms/products";
import { getGlobalSettings } from "@/server/cms/global";
import {
  mapProductsPageLoadResults,
  type ProductsPageContent,
} from "@/server/cms/products-page-mapper";
import { getProductsPage } from "@/server/cms/products-page";

export const dynamic = "force-dynamic";

function assertExpectedCmsError(
  result:
    | PromiseRejectedResult
    | PromiseFulfilledResult<ProductsPageContent | ProductSummary[]>,
) {
  if (
    result.status === "rejected" &&
    !(result.reason instanceof CmsUnavailableError)
  ) {
    throw result.reason;
  }
}

async function loadPageModel() {
  const [contentResult, productsResult] = await Promise.allSettled([
    getProductsPage(),
    getProducts(),
  ]);

  assertExpectedCmsError(contentResult);
  assertExpectedCmsError(productsResult);

  return mapProductsPageLoadResults(contentResult, productsResult);
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [content, settings] = await Promise.all([
      getProductsPage(),
      getGlobalSettings(),
    ]);

    return pageMetadata({
      title: content.seo?.title ?? settings.defaultSeo.title ?? content.title,
      description: content.seo?.description ?? settings.defaultSeo.description,
      imageUrl: content.seo?.imageUrl ?? settings.defaultSeo.imageUrl,
      path: "/tovary",
    });
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;

    return {
      title: "Каталог временно недоступен",
      robots: { index: false, follow: false },
    };
  }
}

export default async function TovaryPage() {
  const [pageModel, settings] = await Promise.all([
    loadPageModel(),
    getGlobalSettings(),
  ]);
  const { content, products, contentUnavailable, productsUnavailable } =
    pageModel;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Главная", href: "/" },
    { name: settings.sectionBreadcrumbs.tovary, href: "/tovary" },
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
      <section className="catalog-intro">
        <Breadcrumbs items={breadcrumbs} />
        {content ? <p className="eyebrow">{content.eyebrow}</p> : null}
        {contentUnavailable ? (
          <div className="catalog-intro__state" role="alert">
            <h1>Вступление временно недоступно</h1>
            <p>Пожалуйста, попробуйте обновить страницу немного позже.</p>
          </div>
        ) : content ? (
          <>
            <h1>{content.title}</h1>
            <div className="catalog-intro__text">
              <p>{content.intro}</p>
            </div>
          </>
        ) : null}
      </section>

      <section
        className="catalog-section"
        aria-label={settings.sectionBreadcrumbs.tovary}
      >
        {productsUnavailable ? (
          <div className="catalog-state" role="alert">
            <p>Каталог временно недоступен.</p>
            <p>Пожалуйста, попробуйте обновить страницу немного позже.</p>
          </div>
        ) : products.length === 0 ? (
          <div className="catalog-state">
            <p>{content?.emptyStateText ?? "Сорта скоро появятся."}</p>
            <Link href="/">
              {content?.emptyStateLinkLabel ?? "Вернуться на главную"}
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
      </section>
    </main>
  );
}
