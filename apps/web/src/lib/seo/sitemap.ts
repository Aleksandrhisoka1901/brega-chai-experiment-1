import type { MetadataRoute } from "next";

import {
  CAPABILITY_PATH,
  CONFORMITY_PATH,
  WHOLESALE_PATH,
} from "../storefront-routes.ts";
import { canonicalUrl } from "./metadata.ts";

export const HTML_SITEMAP_PATH = "/karta-sajta";

export type SitemapGroup = "sections" | "stantsii" | "paneli" | "stati";

export type SitemapEntry = {
  path: string;
  title: string;
  group: SitemapGroup;
  lastModified?: string;
  priority: number;
  changeFrequency: "weekly" | "monthly";
};

export const STATIC_SITEMAP_PAGES: SitemapEntry[] = [
  {
    path: "/",
    title: "Главная",
    group: "sections",
    priority: 1,
    changeFrequency: "weekly",
  },
  {
    path: "/stantsii",
    title: "Портативные электростанции",
    group: "sections",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    path: "/paneli",
    title: "Солнечные панели",
    group: "sections",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    path: "/stati",
    title: "Статьи",
    group: "sections",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    path: WHOLESALE_PATH,
    title: "Для оптовиков",
    group: "sections",
    priority: 0.8,
    changeFrequency: "weekly",
  },
  {
    path: CAPABILITY_PATH,
    title: "Системы хранения энергии",
    group: "sections",
    priority: 0.8,
    changeFrequency: "weekly",
  },
  {
    path: CONFORMITY_PATH,
    title: "Декларация соответствия",
    group: "sections",
    priority: 0.6,
    changeFrequency: "monthly",
  },
  {
    path: HTML_SITEMAP_PATH,
    title: "Карта сайта",
    group: "sections",
    priority: 0.4,
    changeFrequency: "weekly",
  },
];

export const SITEMAP_GROUP_LABELS: Record<SitemapGroup, string> = {
  sections: "Разделы",
  stantsii: "Электростанции",
  paneli: "Солнечные панели",
  stati: "Статьи",
};

export const SITEMAP_GROUP_ORDER: SitemapGroup[] = [
  "sections",
  "stantsii",
  "paneli",
  "stati",
];

export function mergeSitemapEntries(dynamicEntries: SitemapEntry[]) {
  const byPath = new Map<string, SitemapEntry>();
  for (const entry of [...dynamicEntries, ...STATIC_SITEMAP_PAGES]) {
    if (!entry.path.startsWith("/")) continue;
    byPath.set(entry.path, entry);
  }
  return [...byPath.values()].sort((left, right) =>
    left.path.localeCompare(right.path, "en"),
  );
}

export function groupedSitemapEntries(entries: SitemapEntry[]) {
  return SITEMAP_GROUP_ORDER.map((group) => ({
    group,
    label: SITEMAP_GROUP_LABELS[group],
    entries: entries.filter((entry) => entry.group === group),
  })).filter((section) => section.entries.length > 0);
}

export function toMetadataSitemap(
  entries: SitemapEntry[],
  origin: string,
): MetadataRoute.Sitemap {
  return entries.map((entry) => ({
    url: canonicalUrl(entry.path, origin),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
    ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
  }));
}
