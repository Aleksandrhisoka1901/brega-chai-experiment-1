import { z } from "zod";

import { CmsValidationError } from "./errors.ts";

const responseSchema = z.object({
  data: z.object({
    brandName: z.string().trim().min(1),
    email: z.email(),
    telegramUrl: z
      .url()
      .refine((value) => new URL(value).protocol === "https:"),
    navigation: z.object({
      about: z.string().trim().min(1),
      rituals: z.string().trim().min(1),
      products: z.string().trim().min(1),
      cart: z.string().trim().min(1),
    }),
    legalDetails: z.string().trim().min(1),
  }),
});

export type GlobalSettings = z.infer<typeof responseSchema>["data"];

export function mapGlobalSettingsPayload(payload: unknown): GlobalSettings {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) throw new CmsValidationError(parsed.error.message);
  return parsed.data.data;
}
