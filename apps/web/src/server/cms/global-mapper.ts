import { z } from "zod";

import {
  normalizeStrapiBlocks,
  type RichContentBlock,
} from "../../components/rich-content/model.ts";
import { CmsValidationError } from "./errors.ts";

const mediaSchema = z.object({
  url: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  formats: z
    .record(
      z.string(),
      z.object({
        url: z.string().min(1),
        width: z.number().int().positive(),
      }),
    )
    .nullable()
    .optional(),
});

const responseSchema = z.object({
  data: z.object({
    brandName: z.string().trim().min(1),
    pickupAddress: z.string().trim().min(1),
    pickupDiscountPercent: z
      .number()
      .int()
      .min(0)
      .max(100)
      .nullish()
      .transform((value) => value ?? null),
    courierDeliveryNote: z.string().trim().min(1),
    logo: mediaSchema.nullable().optional(),
    email: z.email(),
    telegramUrl: z
      .url()
      .refine((value) => new URL(value).protocol === "https:"),
    navigation: z.object({
      about: z.string().trim().min(1),
      nabory: z.string().trim().min(1),
      tovary: z.string().trim().min(1),
      cart: z.string().trim().min(1),
    }),
    sectionBreadcrumbs: z
      .array(
        z.object({
          route: z.enum(["tovary", "nabory"]),
          label: z.string().trim().min(1),
        }),
      )
      .optional()
      .default([]),
    storefrontTexts: z.object({
      imagePlaceholder: z.string().trim().min(1),
      outOfStock: z.string().trim().min(1),
    }),
    legalDetails: z.string().trim().min(1),
    defaultProductStory: z.array(z.unknown()),
    defaultSeo: z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      image: z
        .object({ url: z.string().min(1) })
        .nullable()
        .optional(),
    }),
  }),
});

export type GlobalSettings = Omit<
  z.infer<typeof responseSchema>["data"],
  "logo" | "defaultProductStory" | "defaultSeo" | "sectionBreadcrumbs"
> & {
  logo?: {
    url: string;
    width: number;
    height: number;
    sources: Array<{ url: string; width: number }>;
  };
  defaultProductStory: RichContentBlock[];
  defaultSeo: {
    title: string;
    description: string;
    imageUrl?: string;
  };
  sectionBreadcrumbs: Record<"tovary" | "nabory", string>;
};

export type CheckoutSettings = Pick<
  GlobalSettings,
  "courierDeliveryNote" | "pickupAddress" | "pickupDiscountPercent"
>;

function mediaUrl(path: string, base: string) {
  return URL.canParse(path) ? path : new URL(path, base).toString();
}

export function mapGlobalSettingsPayload(
  payload: unknown,
  publicBase: string,
): GlobalSettings {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) throw new CmsValidationError(parsed.error.message);
  const {
    logo,
    defaultProductStory,
    defaultSeo,
    sectionBreadcrumbs,
    ...settings
  } = parsed.data.data;
  const breadcrumbLabels: Record<"tovary" | "nabory", string> = {
    tovary: "Сорта",
    nabory: "Ритуалы",
  };
  for (const breadcrumb of sectionBreadcrumbs) {
    breadcrumbLabels[breadcrumb.route] = breadcrumb.label;
  }

  return {
    ...settings,
    sectionBreadcrumbs: breadcrumbLabels,
    ...(logo
      ? {
          logo: {
            url: mediaUrl(logo.url, publicBase),
            width: logo.width,
            height: logo.height,
            sources: Object.values(logo.formats ?? {}).map((format) => ({
              url: mediaUrl(format.url, publicBase),
              width: format.width,
            })),
          },
        }
      : {}),
    defaultProductStory: normalizeStrapiBlocks(defaultProductStory, publicBase),
    defaultSeo: {
      title: defaultSeo.title,
      description: defaultSeo.description,
      ...(defaultSeo.image
        ? { imageUrl: mediaUrl(defaultSeo.image.url, publicBase) }
        : {}),
    },
  };
}
