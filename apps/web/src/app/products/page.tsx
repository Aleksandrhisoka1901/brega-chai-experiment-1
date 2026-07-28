import type { ProductSummary } from "@brega-chai/contracts";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { RichContent } from "@/components/rich-content/rich-content";
import { pageMetadata } from "@/lib/seo/metadata";
import { CmsUnavailableError } from "@/server/cms/errors";
import { getProducts } from "@/server/cms/products";
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
    const content = await getProductsPage();

    return pageMetadata({
      title: content.seo.title,
      description: content.seo.description,
      path: "/products",
    });
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;

    return {
      title: "Каталог временно недоступен",
      robots: { index: false, follow: false },
    };
  }
}

export default async function ProductsPage() {
  const { content, products, contentUnavailable, productsUnavailable } =
    await loadPageModel();

  return (
    <main>
      <section className="catalog-intro">
        <p className="eyebrow">Глава III · Сорта</p>
        {contentUnavailable ? (
          <div className="catalog-intro__state" role="alert">
            <h1>Вступление временно недоступно</h1>
            <p>Пожалуйста, попробуйте обновить страницу немного позже.</p>
          </div>
        ) : content ? (
          <>
            <h1>{content.title}</h1>
            <div className="catalog-intro__text">
              <RichContent content={content.intro} />
            </div>
            {content.image ? (
              <Image
                className="catalog-intro__image"
                src={content.image.url}
                alt={content.image.alt}
                width={content.image.width}
                height={content.image.height}
                sizes="(max-width: 767px) 100vw, 42vw"
                priority
                unoptimized
              />
            ) : null}
          </>
        ) : null}
      </section>

      <section className="catalog-section" aria-labelledby="catalog-title">
        <div className="catalog-heading">
          <h2 id="catalog-title">Все сорта</h2>
          <p>{products.length > 0 ? `${products.length} позиции` : ""}</p>
        </div>

        {productsUnavailable ? (
          <div className="catalog-state" role="alert">
            <p>Каталог временно недоступен.</p>
            <p>Пожалуйста, попробуйте обновить страницу немного позже.</p>
          </div>
        ) : products.length === 0 ? (
          <div className="catalog-state">
            <p>Сорта скоро появятся.</p>
            <Link href="/">Вернуться на главную</Link>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
