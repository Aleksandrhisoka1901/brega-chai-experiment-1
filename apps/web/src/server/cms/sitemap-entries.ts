import { catalogItemPath } from "../../lib/catalog-routes.ts";
import {
  mergeSitemapEntries,
  type SitemapEntry,
} from "../../lib/seo/sitemap.ts";

export type SitemapCmsFetcher = (
  path: string,
  options: { tags: string[] },
) => Promise<unknown>;

const productSitemapRequest = {
  path: `/api/products?${new URLSearchParams({
    status: "published",
    "fields[0]": "slug",
    "fields[1]": "type",
    "fields[2]": "displayName",
    "fields[3]": "updatedAt",
    "sort[0]": "displayName:asc",
    "pagination[pageSize]": "100",
  })}`,
  tags: ["products", "sitemap"],
} as const;

const articleSitemapRequest = {
  path: `/api/articles?${new URLSearchParams({
    status: "published",
    "fields[0]": "slug",
    "fields[1]": "name",
    "fields[2]": "updatedAt",
    "sort[0]": "priority:desc",
    "sort[1]": "name:asc",
    "pagination[pageSize]": "100",
  })}`,
  tags: ["articles", "sitemap"],
} as const;

function recordsFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    return [];
  }
  const data = (payload as { data: unknown }).data;
  return Array.isArray(data) ? data : [];
}

function optionalTimestamp(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function productSitemapEntry(record: unknown): SitemapEntry | null {
  if (!record || typeof record !== "object") return null;
  const row = record as {
    slug?: unknown;
    type?: unknown;
    displayName?: unknown;
    updatedAt?: unknown;
  };
  if (typeof row.slug !== "string" || !row.slug.trim()) return null;
  if (row.type !== "tovar" && row.type !== "nabor") return null;
  const group = row.type === "nabor" ? "paneli" : "stantsii";
  const title =
    typeof row.displayName === "string" && row.displayName.trim()
      ? row.displayName.trim()
      : row.slug;
  return {
    path: catalogItemPath(row.type, row.slug),
    title,
    group,
    priority: 0.8,
    changeFrequency: "weekly",
    ...(optionalTimestamp(row.updatedAt)
      ? { lastModified: optionalTimestamp(row.updatedAt) }
      : {}),
  };
}

function articleSitemapEntry(record: unknown): SitemapEntry | null {
  if (!record || typeof record !== "object") return null;
  const row = record as {
    slug?: unknown;
    name?: unknown;
    updatedAt?: unknown;
  };
  if (typeof row.slug !== "string" || !row.slug.trim()) return null;
  const title =
    typeof row.name === "string" && row.name.trim()
      ? row.name.trim()
      : row.slug;
  return {
    path: `/stati/${row.slug}`,
    title,
    group: "stati",
    priority: 0.7,
    changeFrequency: "weekly",
    ...(optionalTimestamp(row.updatedAt)
      ? { lastModified: optionalTimestamp(row.updatedAt) }
      : {}),
  };
}

async function loadProductSitemapEntries(fetcher: SitemapCmsFetcher) {
  const payload = await fetcher(productSitemapRequest.path, {
    tags: [...productSitemapRequest.tags],
  });
  return recordsFromPayload(payload).flatMap((record) => {
    const entry = productSitemapEntry(record);
    return entry ? [entry] : [];
  });
}

async function loadArticleSitemapEntries(fetcher: SitemapCmsFetcher) {
  const payload = await fetcher(articleSitemapRequest.path, {
    tags: [...articleSitemapRequest.tags],
  });
  return recordsFromPayload(payload).flatMap((record) => {
    const entry = articleSitemapEntry(record);
    return entry ? [entry] : [];
  });
}

export async function loadDynamicSitemapEntries(
  fetcher: SitemapCmsFetcher,
): Promise<SitemapEntry[]> {
  const [products, articles] = await Promise.all([
    loadProductSitemapEntries(fetcher).catch(() => [] as SitemapEntry[]),
    loadArticleSitemapEntries(fetcher).catch(() => [] as SitemapEntry[]),
  ]);
  return [...products, ...articles];
}

export async function loadSitemapEntries(
  fetcher: SitemapCmsFetcher,
): Promise<SitemapEntry[]> {
  return mergeSitemapEntries(await loadDynamicSitemapEntries(fetcher));
}
