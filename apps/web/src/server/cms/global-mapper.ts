import { z } from "zod";
import {
  DEFAULT_MAX_ITEM_QUANTITY,
  maxItemQuantitySchema,
} from "@brega-chai/contracts";

import {
  normalizeStrapiBlocks,
  type RichContentBlock,
} from "../../components/rich-content/model.ts";
import { CmsValidationError } from "./errors.ts";
import { versionCmsMediaUrl } from "./media-url.ts";

const mediaSchema = z.object({
  url: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
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

const legalDocumentSchema = z.object({
  url: z.string().min(1),
  mime: z.string().min(1),
});

const legalDocumentsSchema = z
  .object({
    privacyPolicy: legalDocumentSchema.nullable().optional(),
    terms: legalDocumentSchema.nullable().optional(),
    deliveryAndReturns: legalDocumentSchema.nullable().optional(),
  })
  .nullable()
  .optional();

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
    maxItemQuantity: maxItemQuantitySchema
      .nullish()
      .transform((value) => value ?? DEFAULT_MAX_ITEM_QUANTITY),
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
      stati: z.string().trim().min(1).optional().default("Статьи"),
      cart: z.string().trim().min(1),
    }),
    sectionBreadcrumbs: z
      .array(
        z.object({
          route: z.enum(["tovary", "nabory", "stati"]),
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
    legalDocuments: legalDocumentsSchema,
    defaultProductStory: z.array(z.unknown()),
    defaultSeo: z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      image: z
        .object({ url: z.string().min(1), updatedAt: z.iso.datetime() })
        .nullable()
        .optional(),
    }),
  }),
});

export type GlobalSettings = Omit<
  z.infer<typeof responseSchema>["data"],
  | "logo"
  | "defaultProductStory"
  | "defaultSeo"
  | "sectionBreadcrumbs"
  | "legalDocuments"
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
  sectionBreadcrumbs: Record<"tovary" | "nabory" | "stati", string>;
  legalDocuments?: Partial<
    Record<"privacyPolicy" | "terms" | "deliveryAndReturns", string>
  >;
};

export type CheckoutSettings = Pick<
  GlobalSettings,
  | "courierDeliveryNote"
  | "pickupAddress"
  | "pickupDiscountPercent"
  | "maxItemQuantity"
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
    legalDocuments,
    ...settings
  } = parsed.data.data;
  const breadcrumbLabels: Record<"tovary" | "nabory" | "stati", string> = {
    tovary: "Сорта",
    nabory: "Ритуалы",
    stati: "Статьи",
  };
  for (const breadcrumb of sectionBreadcrumbs) {
    breadcrumbLabels[breadcrumb.route] = breadcrumb.label;
  }

  const legalDocumentUrls: GlobalSettings["legalDocuments"] = {};
  for (const field of [
    "privacyPolicy",
    "terms",
    "deliveryAndReturns",
  ] as const) {
    const document = legalDocuments?.[field];
    if (document?.mime === "application/pdf") {
      legalDocumentUrls[field] = mediaUrl(document.url, publicBase);
    }
  }

  return {
    ...settings,
    sectionBreadcrumbs: breadcrumbLabels,
    ...(Object.keys(legalDocumentUrls).length > 0
      ? { legalDocuments: legalDocumentUrls }
      : {}),
    ...(logo
      ? {
          logo: {
            url: versionCmsMediaUrl(logo.url, publicBase, logo.updatedAt),
            width: logo.width,
            height: logo.height,
            sources: Object.values(logo.formats ?? {}).map((format) => ({
              url: versionCmsMediaUrl(format.url, publicBase, logo.updatedAt),
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
        ? {
            imageUrl: versionCmsMediaUrl(
              defaultSeo.image.url,
              publicBase,
              defaultSeo.image.updatedAt,
            ),
          }
        : {}),
    },
  };
}
