import { checkoutFieldLimits } from "@brega-chai/contracts";
import { z } from "zod";

import { normalizeRussianPhone } from "../checkout/validation.ts";

const optionalText = (limit: number, message: string) =>
  z
    .string()
    .max(limit, message)
    .trim()
    .transform((value) => value || undefined);

export const inquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Укажите имя")
    .max(
      checkoutFieldLimits.name,
      `Не больше ${checkoutFieldLimits.name} символов`,
    ),
  phone: z
    .string()
    .trim()
    .min(1, "Укажите телефон")
    .max(
      checkoutFieldLimits.phoneInput,
      `Не больше ${checkoutFieldLimits.phoneInput} символов`,
    )
    .transform((value, context) => {
      try {
        return normalizeRussianPhone(value);
      } catch {
        context.addIssue({
          code: "custom",
          message: "Введите корректный номер телефона",
        });
        return z.NEVER;
      }
    }),
  email: z
    .union([
      z.literal(""),
      z
        .string()
        .max(
          checkoutFieldLimits.email,
          `Не больше ${checkoutFieldLimits.email} символов`,
        )
        .pipe(z.email("Проверьте адрес электронной почты")),
    ])
    .transform((value) => value || undefined),
  comment: optionalText(
    checkoutFieldLimits.comment,
    `Не больше ${checkoutFieldLimits.comment} символов`,
  ),
  modelInterest: optionalText(80, "Не больше 80 символов"),
  privacyConsent: z
    .boolean()
    .refine((value) => value, "Необходимо согласие на обработку данных"),
});

export type InquiryFormValues = z.input<typeof inquirySchema>;
export type InquiryPayload = z.output<typeof inquirySchema>;
export type InquiryField = keyof InquiryFormValues;
