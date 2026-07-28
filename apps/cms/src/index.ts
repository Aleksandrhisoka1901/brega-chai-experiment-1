import { registerOrderStatusMiddleware } from "./api/order/order-status-middleware.js";
import { registerCacheRevalidation } from "./cache-revalidation/index.js";

export default {
  register() {},
  bootstrap({ strapi }: { strapi: any }) {
    registerOrderStatusMiddleware(strapi);
    registerCacheRevalidation(strapi);
  },
};
