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
  pattern: "/[type]y/[slug]",
  priority: 0.8,
  frequency: "weekly",
  lastModified: "true",
  thumbnail: "-",
  populateLinkedModels: "false",
} as const;

export const DEFAULT_SITEMAP_URLS = [
  { slug: "/", priority: 1, frequency: "weekly" },
  { slug: "/tovary", priority: 0.9, frequency: "weekly" },
] as const;

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

  if (!existing.baseUrl?.trim()) {
    await query.update({ where: { id: existing.id }, data: { baseUrl } });
  }
}

async function ensureProductCollection(strapi: any) {
  const query = strapi.db.query(COLLECTION_UID);
  const existing = await query.findMany();
  if (existing.some((entry: { type?: string }) => entry.type === "product")) {
    return;
  }
  await query.create({ data: DEFAULT_SITEMAP_COLLECTION });
}

async function ensureCustomUrls(strapi: any) {
  const query = strapi.db.query(CUSTOM_URL_UID);
  const existing = await query.findMany();
  const slugs = new Set(
    existing.map((entry: { slug?: string }) => entry.slug?.trim()),
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
