import { checkoutFieldLimits } from "@brega-chai/contracts";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

const optionalText = (limit: number, message: string) =>
  z
    .string()
    .max(limit, message)
    .trim()
    .transform((value) => value || undefined);

export function normalizeRussianPhone(value: string): string {
  const phone = parsePhoneNumberFromString(value, "RU");
  if (!phone?.isValid()) {
    throw new Error("Введите корректный номер телефона");
  }
  return phone.number;
}

export const checkoutSchema = z
  .object({
    deliveryMethod: z.enum(["pickup", "courier"], {
      error: "Выберите способ получения",
    }),
    name: z
      .string()
      .trim()
      .min(1, "Укажите ФИО")
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
    deliveryAddress: z
      .string()
      .trim()
      .max(
        checkoutFieldLimits.deliveryAddress,
        `Не больше ${checkoutFieldLimits.deliveryAddress} символов`,
      ),
    comment: optionalText(
      checkoutFieldLimits.comment,
      `Не больше ${checkoutFieldLimits.comment} символов`,
    ),
    privacyConsent: z
      .boolean()
      .refine((value) => value, "Необходимо согласие на обработку данных"),
    termsConsent: z
      .boolean()
      .refine(
        (value) => value,
        "Необходимо принять условия продажи и доставки",
      ),
  })
  .superRefine(({ deliveryAddress, deliveryMethod }, context) => {
    if (deliveryMethod === "courier" && !deliveryAddress) {
      context.addIssue({
        code: "custom",
        message: "Укажите адрес доставки",
        path: ["deliveryAddress"],
      });
    }
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
