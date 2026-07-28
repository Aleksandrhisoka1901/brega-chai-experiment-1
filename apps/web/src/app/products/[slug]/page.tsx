import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/product-detail";
import { JsonLd } from "@/components/json-ld";
import { canonicalUrl, pageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbStructuredData,
  productStructuredData,
} from "@/lib/seo/structured-data";
import { CmsUnavailableError } from "@/server/cms/errors";
import { getProductBySlug } from "@/server/cms/product-detail";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductBySlug("product", slug);

    if (!product) return {};

    return pageMetadata({
      title: product.title,
      description: product.excerpt,
      path: `/products/${product.slug}`,
    });
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;

    return {
      title: "Страница товара временно недоступна",
      robots: { index: false, follow: false },
    };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  try {
    const product = await getProductBySlug("product", slug);

    if (!product) notFound();
    const productUrl = canonicalUrl(`/products/${product.slug}`);

    return (
      <main>
        <JsonLd data={productStructuredData(product, productUrl)} />
        <JsonLd
          data={breadcrumbStructuredData([
            { name: "Главная", url: canonicalUrl("/") },
            { name: "Сорта", url: canonicalUrl("/products") },
            { name: product.title, url: productUrl },
          ])}
        />
        <ProductDetail product={product} />
      </main>
    );
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;

    return (
      <main className="holding-page">
        <div role="alert">
          <p className="eyebrow">Сервис временно недоступен</p>
          <h1>Страница товара временно недоступна</h1>
          <p>Пожалуйста, попробуйте открыть её немного позже.</p>
        </div>
      </main>
    );
  }
}
