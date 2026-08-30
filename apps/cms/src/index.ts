import { registerOrderStatusMiddleware } from "./api/order/order-status-middleware.js";
import { syncAdminContentManager } from "./admin-content-manager.js";
import { ensureRussianAdminLocale } from "./admin-localization.js";
import { russianAdminTranslations } from "./admin/app.js";
import { registerCacheRevalidation } from "./cache-revalidation/index.js";
import { ensureGlobalContentDefaults } from "./content-migration.js";
import { ensureHomeArticlesPreview } from "./home-articles-configuration.js";
import { ensureHomeEditorialPalette } from "./home-palette-configuration.js";
import { ensureRelatedItemsPermissions } from "./related-items-configuration.js";
import { ensureSitemapConfiguration } from "./sitemap-configuration.js";
import { ensureRitualsPageConfiguration } from "./rituals-page-configuration.js";
import { ensureChapterEyebrowsCleared } from "./chapter-eyebrow.js";
import { ensureWholesalePageConfiguration } from "./wholesale-page-configuration.js";

export default {
  register() {},
  async bootstrap({ strapi }: { strapi: any }) {
    await ensureRussianAdminLocale(strapi);
    await ensureGlobalContentDefaults(strapi);
    await ensureRitualsPageConfiguration(strapi);
    await ensureWholesalePageConfiguration(strapi);
    await ensureRelatedItemsPermissions(strapi);
    await ensureHomeArticlesPreview(strapi);
    await ensureHomeEditorialPalette(strapi);
    await ensureChapterEyebrowsCleared(strapi);
    await ensureSitemapConfiguration(strapi);
    await syncAdminContentManager(strapi, russianAdminTranslations);
    registerOrderStatusMiddleware(strapi);
    registerCacheRevalidation(strapi);
  },
};
