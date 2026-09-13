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
    customerEmail: z
      .union([z.literal(""), z.email().max(254)])
      .optional()
      .transform((value) => value || undefined),
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

export class InquiryServiceError extends Error {
  constructor(
    readonly code: "INVALID_INPUT",
    message: string,
  ) {
    super(message);
    this.name = "InquiryServiceError";
  }
}

export function parseInquiryInput(value: unknown): InquiryInput {
  const parsed = inquiryInputSchema.safeParse(value);
  if (!parsed.success) {
    throw new InquiryServiceError("INVALID_INPUT", "Проверьте данные формы.");
  }
  return parsed.data;
}
