import { registerOrderStatusMiddleware } from "./api/order/order-status-middleware.js";
import { syncAdminContentManager } from "./admin-content-manager.js";
import { registerCacheRevalidation } from "./cache-revalidation/index.js";
import { ensureGlobalContentDefaults } from "./content-migration.js";

export default {
  register() {},
  async bootstrap({ strapi }: { strapi: any }) {
    await ensureGlobalContentDefaults(strapi);
    await syncAdminContentManager(strapi);
    registerOrderStatusMiddleware(strapi);
    registerCacheRevalidation(strapi);
  },
};
