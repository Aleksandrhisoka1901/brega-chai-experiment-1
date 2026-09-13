import { factories } from "@strapi/strapi";

import { InquiryServiceError } from "../services/inquiry-domain";

const INQUIRY_UID = "api::inquiry.inquiry" as const;

export default factories.createCoreController(INQUIRY_UID, ({ strapi }) => ({
  async create(ctx) {
    try {
      const result = await strapi.service(INQUIRY_UID).createFromInput(
        ctx.request.body,
      );
      ctx.status = 201;
      ctx.body = { data: result };
    } catch (error) {
      if (error instanceof InquiryServiceError) {
        ctx.status = 400;
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
