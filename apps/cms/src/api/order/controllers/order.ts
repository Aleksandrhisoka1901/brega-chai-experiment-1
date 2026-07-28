import { factories } from "@strapi/strapi";

import { OrderServiceError } from "../services/order-domain";

const ORDER_UID = "api::order.order" as const;

const errorStatus: Record<OrderServiceError["code"], number> = {
  INVALID_INPUT: 400,
  IDEMPOTENCY_CONFLICT: 409,
  PRODUCT_NOT_FOUND: 409,
  PRODUCT_UNAVAILABLE: 409,
  INSUFFICIENT_STOCK: 409,
  ORDER_NOT_FOUND: 404,
  INVALID_STATUS: 400,
  INVALID_STATUS_TRANSITION: 409,
  STOCK_RESTORE_FAILED: 409,
};

export default factories.createCoreController(ORDER_UID, ({ strapi }) => ({
  async create(ctx) {
    try {
      const result = await strapi
        .service(ORDER_UID)
        .createFromInput(ctx.request.body);
      ctx.status = 201;
      ctx.body = { data: result };
    } catch (error) {
      if (error instanceof OrderServiceError) {
        ctx.status = errorStatus[error.code];
        ctx.body = {
          error: {
            code: error.code,
            message: error.message,
          },
        };
        return;
      }
      throw error;
    }
  },
}));
