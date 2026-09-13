import { z } from "zod";

const inquiryPayloadSchema = z
  .object({
    customerName: z.string().trim().min(1).max(100),
    customerPhone: z.string().trim().regex(/^\+7\d{10}$/),
    customerEmail: z.email().max(254).optional(),
    comment: z.string().trim().max(1000).optional(),
    source: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^\/[A-Za-z0-9/_-]*$/),
    modelInterest: z.string().trim().max(80).optional(),
    privacyConsent: z.literal(true),
  })
  .strict();

export const browserInquiryRequestSchema = z
  .object({
    formToken: z.string().min(1),
    honeypot: z.boolean(),
    inquiry: inquiryPayloadSchema,
  })
  .strict();

export const parseBrowserInquiryRequest = (value: unknown) =>
  browserInquiryRequestSchema.safeParse(value);
