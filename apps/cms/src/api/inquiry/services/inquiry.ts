import { factories } from "@strapi/strapi";

import { parseInquiryInput } from "./inquiry-domain";

const INQUIRY_UID = "api::inquiry.inquiry" as const;

export default factories.createCoreService(INQUIRY_UID, ({ strapi }) => ({
  async createFromInput(rawInput: unknown) {
    const input = parseInquiryInput(rawInput);
    const created = await strapi.documents(INQUIRY_UID).create({
      data: {
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        ...(input.customerEmail ? { customerEmail: input.customerEmail } : {}),
        ...(input.comment ? { comment: input.comment } : {}),
        source: input.source,
        ...(input.modelInterest ? { modelInterest: input.modelInterest } : {}),
        inquiryStatus: "new",
      },
    });

    const id = created.documentId;
    if (!id) {
      throw new Error("Strapi did not return an inquiry document id");
    }
    return { id };
  },
}));
