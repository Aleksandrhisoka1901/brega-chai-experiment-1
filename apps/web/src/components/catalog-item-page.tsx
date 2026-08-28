import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { canonicalUrl, pageMetadata } from "@/lib/seo/metadata";
import {
  catalogCollectionPath,
  catalogItemPath,
  type CatalogCollectionRoute,
} from "@/lib/catalog-routes";
import {
  breadcrumbStructuredData,
  productStructuredData,
} from "@/lib/seo/structured-data";
import { CmsUnavailableError } from "@/server/cms/errors";
import { getProductBySlug } from "@/server/cms/product-detail";
import { getGlobalSettings } from "@/server/cms/global";

import { JsonLd } from "./json-ld";
import { type BreadcrumbItem } from "./breadcrumbs";
import { ProductDetail } from "./product-detail";

type CatalogItemPageOptions = {
  route: CatalogCollectionRoute;
  slug: string;
};

const routeConfig = {
  stantsii: {
    collectionUrl: catalogCollectionPath("tovar"),
    type: "tovar" as const,
  },
  paneli: {
    collectionUrl: catalogCollectionPath("nabor"),
    type: "nabor" as const,
  },
} as const;

export async function catalogItemMetadata({
  route,
  slug,
}: CatalogItemPageOptions): Promise<Metadata> {
  const { collectionUrl, type } = routeConfig[route];
  try {
    const [product, settings] = await Promise.all([
      getProductBySlug(type, slug),
      getGlobalSettings(),
    ]);

    if (!product) return {};

    return pageMetadata({
      title:
        product.seo?.title ??
        settings.defaultSeo.title ??
        `${product.title} — ${product.categoryLabel} ${settings.brandName}`,
      description:
        product.seo?.description ??
        settings.defaultSeo.description ??
        product.excerpt,
      imageUrl: product.seo?.imageUrl ?? settings.defaultSeo.imageUrl,
      path: catalogItemPath(type, product.slug),
    });
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;

    return {
      title: "Страница товара временно недоступна",
      robots: { index: false, follow: false },
    };
  }
}

export async function CatalogItemPage(options: CatalogItemPageOptions) {
  const { route, slug } = options;
  const { collectionUrl, type } = routeConfig[route];

  try {
    const [product, settings] = await Promise.all([
      getProductBySlug(type, slug),
      getGlobalSettings(),
    ]);

    if (!product) notFound();
    const productUrl = canonicalUrl(catalogItemPath(type, product.slug));
    const breadcrumbs: BreadcrumbItem[] = [
      { name: "Главная", href: "/" },
      { name: settings.sectionBreadcrumbs[route], href: collectionUrl },
      {
        name: product.breadcrumbLabel,
        href: catalogItemPath(type, product.slug),
      },
    ];

    return (
      <main>
        <JsonLd
          data={productStructuredData(product, productUrl, settings.brandName)}
        />
        <JsonLd
          data={breadcrumbStructuredData([
            ...breadcrumbs.map((item) => ({
              name: item.name,
              url: canonicalUrl(item.href),
            })),
          ])}
        />
        <ProductDetail
          brandName={settings.brandName}
          boutiqueStory={settings.defaultProductStory}
          breadcrumbs={breadcrumbs}
          imagePlaceholder={settings.storefrontTexts.imagePlaceholder}
          maxItemQuantity={settings.maxItemQuantity}
          outOfStock={settings.storefrontTexts.outOfStock}
          product={product}
        />
      </main>
    );
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;

    return (
      <main className="holding-page content-frame" data-content-frame>
        <div role="alert">
          <p className="eyebrow">Сервис временно недоступен</p>
          <h1>Страница товара временно недоступна</h1>
          <p>Пожалуйста, попробуйте открыть её немного позже.</p>
        </div>
      </main>
    );
  }
}
