import { registerOrderStatusMiddleware } from "./api/order/order-status-middleware.js";
import { syncAdminContentManager } from "./admin-content-manager.js";
import { ensureRussianAdminLocale } from "./admin-localization.js";
import { russianAdminTranslations } from "./admin/app.js";
import { registerCacheRevalidation } from "./cache-revalidation/index.js";
import { ensureGlobalContentDefaults } from "./content-migration.js";
import { ensureSitemapConfiguration } from "./sitemap-configuration.js";

export default {
  register() {},
  async bootstrap({ strapi }: { strapi: any }) {
    await ensureRussianAdminLocale(strapi);
    await ensureGlobalContentDefaults(strapi);
    await ensureSitemapConfiguration(strapi);
    await syncAdminContentManager(strapi, russianAdminTranslations);
    registerOrderStatusMiddleware(strapi);
    registerCacheRevalidation(strapi);
  },
};
