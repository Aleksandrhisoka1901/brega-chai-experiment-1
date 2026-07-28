import type { ProductDetail } from "@/server/cms/product-detail-mapper";

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function productStructuredData(product: ProductDetail, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.excerpt,
    sku: product.id,
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

export function organizationStructuredData(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Brega Chai",
    url: origin,
  };
}

export function websiteStructuredData(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Brega Chai",
    url: origin,
  };
}
