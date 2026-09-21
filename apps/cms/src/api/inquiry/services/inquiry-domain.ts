import { z } from "zod";

const optionalText = (limit: number) =>
  z
    .string()
    .max(limit)
    .trim()
    .transform((value) => value || undefined);

export const inquiryInputSchema = z
  .object({
    customerName: z.string().trim().min(1).max(100),
    customerPhone: z
      .string()
      .trim()
      .regex(/^\+7\d{10}$/, "Некорректный телефон"),
    customerEmail: z.string().trim().email().max(254),
    comment: optionalText(1000).optional(),
    source: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^\/[A-Za-z0-9/_-]*$/, "Некорректный источник"),
    modelInterest: optionalText(80).optional(),
    privacyConsent: z.literal(true),
  })
  .strict();

export type InquiryInput = z.infer<typeof inquiryInputSchema>;

export const inquiryStatusSchema = z.enum(["new", "processed"]);
export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;

export const allowedInquiryStatusTargets: Record<
  InquiryStatus,
  InquiryStatus[]
> = {
  new: ["processed"],
  processed: ["new"],
};

export class InquiryServiceError extends Error {
  readonly code:
    | "INVALID_INPUT"
    | "INQUIRY_NOT_FOUND"
    | "INVALID_STATUS_TRANSITION";

  constructor(
    code:
      | "INVALID_INPUT"
      | "INQUIRY_NOT_FOUND"
      | "INVALID_STATUS_TRANSITION",
    message: string,
  ) {
    super(message);
    this.name = "InquiryServiceError";
    this.code = code;
  }
}

export function parseInquiryInput(value: unknown): InquiryInput {
  const parsed = inquiryInputSchema.safeParse(value);
  if (!parsed.success) {
    throw new InquiryServiceError("INVALID_INPUT", "Проверьте данные формы.");
  }
  return parsed.data;
}

export function parseInquiryStatus(value: unknown): InquiryStatus {
  const parsed = inquiryStatusSchema.safeParse(value);
  if (!parsed.success) {
    throw new InquiryServiceError("INVALID_INPUT", "Некорректный статус заявки");
  }
  return parsed.data;
}
