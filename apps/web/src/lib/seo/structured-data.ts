import type { ProductDetail } from "../../server/cms/product-detail-mapper.ts";
import { BRAND_EMAIL, BRAND_NAME, BRAND_TELEGRAM_URL } from "../brand.ts";

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function productStructuredData(
  product: ProductDetail,
  url: string,
  brandName = BRAND_NAME,
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

export function organizationStructuredData(
  origin: string,
  brandName: string,
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressCountry?: string;
    logo?: string;
  },
) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brandName,
    url: origin,
    email: BRAND_EMAIL,
    sameAs: [BRAND_TELEGRAM_URL],
    ...(address?.logo ? { logo: address.logo } : {}),
    areaServed: {
      "@type": "Country",
      name: "RU",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: address?.addressLocality ?? "Москва",
      addressCountry: address?.addressCountry ?? "RU",
      ...(address?.streetAddress
        ? { streetAddress: address.streetAddress }
        : {}),
    },
  };
}

export function streetAddressFromPickup(pickupAddress?: string | null) {
  if (!pickupAddress?.trim()) return "проезд Серебрякова, д. 14, стр. 6";
  return pickupAddress
    .replace(/^самовывоз осуществляется по адресу:\s*/i, "")
    .replace(/^г\.\s*москва,\s*/i, "")
    .trim();
}

export function websiteStructuredData(origin: string, brandName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brandName,
    url: origin,
    inLanguage: "ru-RU",
    publisher: {
      "@type": "Organization",
      name: brandName,
      url: origin,
    },
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
    inLanguage: "ru-RU",
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
  let publisherUrl: string | undefined;
  try {
    publisherUrl = new URL(url).origin;
  } catch {
    publisherUrl = undefined;
  }

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    url,
    inLanguage: "ru-RU",
    ...(imageUrl ? { image: imageUrl } : {}),
    author: {
      "@type": "Organization",
      name: brandName,
    },
    publisher: {
      "@type": "Organization",
      name: brandName,
      ...(publisherUrl ? { url: publisherUrl } : {}),
    },
  };
}
