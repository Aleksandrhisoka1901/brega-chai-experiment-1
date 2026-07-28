import { registerOrderStatusMiddleware } from "./api/order/order-status-middleware.js";

export default {
  register() {},
  bootstrap({ strapi }: { strapi: any }) {
    registerOrderStatusMiddleware(strapi);
  },
};
