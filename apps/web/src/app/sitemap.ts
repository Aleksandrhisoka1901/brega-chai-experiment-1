import type { MetadataRoute } from "next";

import { canonicalUrl } from "@/lib/seo/metadata";
import { CmsUnavailableError } from "@/server/cms/errors";
import { getSitemapProducts } from "@/server/cms/sitemap";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: canonicalUrl("/") },
    { url: canonicalUrl("/products") },
  ];

  try {
    const products = await getSitemapProducts();
    return [
      ...staticEntries,
      ...products.map((product) => ({
        url: canonicalUrl(
          `/${product.type === "ritual" ? "rituals" : "products"}/${product.slug}`,
        ),
        lastModified: new Date(product.updatedAt),
      })),
    ];
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;
    return staticEntries;
  }
}
