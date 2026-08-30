export const SITEMAP_PLUGIN_ID = "strapi-5-sitemap-plugin";
export const SITEMAP_PERMISSION_ACTION =
  "plugin::strapi-5-sitemap-plugin.controller.getSitemap";

const OPTIONS_UID =
  "plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-option";
const COLLECTION_UID =
  "plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-content-type";
const CUSTOM_URL_UID =
  "plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-content-type-single-url";

export const DEFAULT_SITEMAP_COLLECTION = {
  type: "product",
  langcode: "-",
  pattern: "/[catalogRoute]/[slug]",
  priority: 0.8,
  frequency: "weekly",
  lastModified: "true",
  thumbnail: "-",
  populateLinkedModels: "false",
} as const;

export const DEFAULT_SITEMAP_ARTICLE_COLLECTION = {
  type: "article",
  langcode: "-",
  pattern: "/stati/[slug]",
  priority: 0.7,
  frequency: "weekly",
  lastModified: "true",
  thumbnail: "-",
  populateLinkedModels: "false",
} as const;

export const DEFAULT_SITEMAP_URLS = [
  { slug: "/", priority: 1, frequency: "weekly" },
  { slug: "/stantsii", priority: 0.9, frequency: "weekly" },
  { slug: "/paneli", priority: 0.9, frequency: "weekly" },
  { slug: "/stati", priority: 0.9, frequency: "weekly" },
  { slug: "/dlya-optovikov", priority: 0.8, frequency: "weekly" },
] as const;

export function shouldReplaceSitemapOrigin(
  existing: string | undefined,
  next: string,
): boolean {
  if (!existing?.trim()) return true;
  if (existing.trim() === next) return false;
  try {
    const hostname = new URL(existing).hostname;
    return hostname === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  } catch {
    return true;
  }
}

export function normalizeSitemapOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("SITE_URL must use http or https");
  }
  if (url.username || url.password) {
    throw new Error("SITE_URL must not contain credentials");
  }
  return url.origin;
}

async function ensurePublicPermission(strapi: any) {
  const role = await strapi.db
    .query("plugin::users-permissions.role")
    .findOne({ where: { type: "public" }, populate: ["permissions"] });

  if (!role) throw new Error("Public role was not found");
  if (
    (role.permissions ?? []).some(
      (permission: { action: string }) =>
        permission.action === SITEMAP_PERMISSION_ACTION,
    )
  ) {
    return;
  }

  await strapi.db.query("plugin::users-permissions.permission").create({
    data: { action: SITEMAP_PERMISSION_ACTION, role: role.id },
  });
}

async function ensurePluginOptions(strapi: any, baseUrl: string) {
  const query = strapi.db.query(OPTIONS_UID);
  const [existing] = await query.findMany({ limit: 1 });

  if (!existing) {
    await query.create({
      data: {
        baseUrl,
        excludedUrls: [],
        useSitemapIndex: false,
        sitemapDefinitions: [],
      },
    });
    return;
  }

  if (shouldReplaceSitemapOrigin(existing.baseUrl, baseUrl)) {
    await query.update({ where: { id: existing.id }, data: { baseUrl } });
  }
}

const LEGACY_PRODUCT_SITEMAP_PATTERN = "/[type]y/[slug]";

type SitemapCollectionEntry = { id: number; type?: string; pattern?: string };

async function ensureProductCollection(strapi: any) {
  const query = strapi.db.query(COLLECTION_UID);
  const existing = (await query.findMany()) as SitemapCollectionEntry[];
  const byType = new Map(
    existing.map((entry) => [entry.type, entry] as const),
  );

  const productEntry = byType.get("product");
  if (!productEntry) {
    await query.create({ data: DEFAULT_SITEMAP_COLLECTION });
  } else if (productEntry.pattern === LEGACY_PRODUCT_SITEMAP_PATTERN) {
    await query.update({
      where: { id: productEntry.id },
      data: { pattern: DEFAULT_SITEMAP_COLLECTION.pattern },
    });
  }

  if (!byType.has("article")) {
    await query.create({ data: DEFAULT_SITEMAP_ARTICLE_COLLECTION });
  }
}

const LEGACY_SITEMAP_SLUGS = new Set(["/tovary", "/nabory"]);

async function ensureCustomUrls(strapi: any) {
  const query = strapi.db.query(CUSTOM_URL_UID);
  const existing = await query.findMany();

  for (const entry of existing as Array<{ id: number; slug?: string }>) {
    if (LEGACY_SITEMAP_SLUGS.has(entry.slug?.trim() ?? "")) {
      await query.delete({ where: { id: entry.id } });
    }
  }

  const remaining = await query.findMany();
  const slugs = new Set(
    remaining.map((entry: { slug?: string }) => entry.slug?.trim()),
  );

  for (const entry of DEFAULT_SITEMAP_URLS) {
    if (!slugs.has(entry.slug)) await query.create({ data: entry });
  }
}

export async function ensureSitemapConfiguration(
  strapi: any,
  siteUrl = process.env.SITE_URL ?? "http://localhost:3000",
) {
  const baseUrl = normalizeSitemapOrigin(siteUrl);
  await ensurePluginOptions(strapi, baseUrl);
  await ensureProductCollection(strapi);
  await ensureCustomUrls(strapi);
  await ensurePublicPermission(strapi);
}
