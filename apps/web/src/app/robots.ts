import type { MetadataRoute } from "next";

import { canonicalUrl, siteOrigin } from "@/lib/seo/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    host: siteOrigin(),
    sitemap: canonicalUrl("/sitemap.xml"),
  };
}
