import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined);

export function normalizeRussianPhone(value: string): string {
  const phone = parsePhoneNumberFromString(value, "RU");
  if (!phone?.isValid()) {
    throw new Error("Введите корректный номер телефона");
  }
  return phone.number;
}

export const checkoutSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя"),
  phone: z
    .string()
    .trim()
    .min(1, "Укажите телефон")
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
    .union([z.literal(""), z.email("Проверьте адрес электронной почты")])
    .transform((value) => value || undefined),
  deliveryAddress: z.string().trim().min(1, "Укажите адрес доставки"),
  comment: optionalText,
  privacyConsent: z
    .boolean()
    .refine((value) => value, "Необходимо согласие на обработку данных"),
  termsConsent: z
    .boolean()
    .refine((value) => value, "Необходимо принять условия продажи и доставки"),
});

export type CheckoutFormValues = z.input<typeof checkoutSchema>;
export type CheckoutPayload = z.output<typeof checkoutSchema>;
export type CheckoutField = keyof CheckoutFormValues;

export function validateCheckout(values: CheckoutFormValues) {
  const result = checkoutSchema.safeParse(values);
  if (result.success) return result;

  const errors: Partial<Record<CheckoutField, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as CheckoutField | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }

  return {
    success: false as const,
    errors,
    firstInvalidField: Object.keys(errors)[0] as CheckoutField | undefined,
  };
}
