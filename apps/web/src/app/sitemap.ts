import type { MetadataRoute } from "next";

import { siteOrigin } from "@/lib/seo/metadata";
import { toMetadataSitemap } from "@/lib/seo/sitemap";
import { fetchCms } from "@/server/cms/client";
import { loadSitemapEntries } from "@/server/cms/sitemap-entries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return toMetadataSitemap(await loadSitemapEntries(fetchCms), siteOrigin());
}
