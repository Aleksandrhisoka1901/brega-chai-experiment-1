import type { ProductDetail } from "@/server/cms/product-detail-mapper";

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function productStructuredData(
  product: ProductDetail,
  url: string,
  brandName = "Brega Tea",
) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.excerpt,
    category: product.categoryLabel,
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: brandName,
    },
    ...(product.images[0] ? { image: product.images[0].url } : {}),
    offers: {
      "@type": "Offer",
      url,
      price: product.priceRubles,
      priceCurrency: product.currency,
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
}

export function breadcrumbStructuredData(
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function organizationStructuredData(origin: string, brandName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brandName,
    url: origin,
  };
}

export function websiteStructuredData(origin: string, brandName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brandName,
    url: origin,
  };
}

export function collectionPageStructuredData({
  name,
  description,
  url,
}: {
  name: string;
  description?: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url,
    ...(description ? { description } : {}),
  };
}

export function articleStructuredData({
  headline,
  description,
  url,
  imageUrl,
  brandName,
}: {
  headline: string;
  description: string;
  url: string;
  imageUrl?: string;
  brandName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    url,
    ...(imageUrl ? { image: imageUrl } : {}),
    publisher: {
      "@type": "Organization",
      name: brandName,
    },
  };
}
