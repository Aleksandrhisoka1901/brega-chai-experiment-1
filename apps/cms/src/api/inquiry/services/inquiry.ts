import { factories } from "@strapi/strapi";

import {
  allowedInquiryStatusTargets,
  InquiryServiceError,
  parseInquiryInput,
  parseInquiryStatus,
  type InquiryStatus,
} from "./inquiry-domain";

const INQUIRY_UID = "api::inquiry.inquiry" as const;

export default factories.createCoreService(INQUIRY_UID, ({ strapi }) => ({
  async createFromInput(rawInput: unknown) {
    const input = parseInquiryInput(rawInput);
    const created = await strapi.documents(INQUIRY_UID).create({
      data: {
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
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

  async transitionStatus(documentId: string, status: unknown) {
    const next = parseInquiryStatus(status);
    const current = await strapi.db.query(INQUIRY_UID).findOne({
      where: { documentId },
    });
    if (!current) {
      throw new InquiryServiceError("INQUIRY_NOT_FOUND", "Заявка не найдена");
    }

    const currentStatus = current.inquiryStatus as InquiryStatus;
    const allowed = allowedInquiryStatusTargets[currentStatus] ?? [];
    if (!allowed.includes(next)) {
      throw new InquiryServiceError(
        "INVALID_STATUS_TRANSITION",
        "Статус заявки уже изменился",
      );
    }

    await strapi.documents(INQUIRY_UID).update({
      documentId,
      data: { inquiryStatus: next },
    });
  },

  async deleteFromAdmin(documentId: string) {
    const current = await strapi.db.query(INQUIRY_UID).findOne({
      where: { documentId },
    });
    if (!current) {
      throw new InquiryServiceError("INQUIRY_NOT_FOUND", "Заявка не найдена");
    }

    await strapi.documents(INQUIRY_UID).delete({ documentId });
  },
}));
