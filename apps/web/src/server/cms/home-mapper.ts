import { z } from "zod";

import { CmsValidationError } from "./errors.ts";
import { versionCmsMediaUrl } from "./media-url.ts";
import { mapProductsPayload } from "./product-mapper.ts";

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
const imageSchema = z.object({
  alt: z.string().nullable().optional(),
  image: mediaSchema,
});
const linkSchema = z.object({
  label: z.string().min(1),
  url: z.string().min(1),
});
const optionalEyebrowSchema = z.string().nullable().optional();
export const DEFAULT_HERO_COLORS = {
  background: "#AFB094",
  text: "#24251E",
} as const;
const previewSchema = z.object({
  eyebrow: optionalEyebrowSchema,
  title: z.string().min(1),
  subtitle: z.string().min(1).nullable().optional(),
  linkLabel: z.string().min(1).nullable().optional(),
});
const seoSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  image: z
    .object({ url: z.string().min(1), updatedAt: z.iso.datetime() })
    .nullable()
    .optional(),
});
const responseSchema = z.object({
  data: z.object({
    seo: seoSchema.nullable().optional(),
    hero: z.object({
      eyebrow: optionalEyebrowSchema,
      title: z.string().min(1),
      text: z.string().min(1),
      layout: z.enum(["50/50", "40/60", "100/0"]),
      image: imageSchema.nullable().optional(),
      backgroundColor: z.string().nullable().optional(),
      textColor: z.string().nullable().optional(),
      cta: linkSchema.nullable().optional(),
    }),
    about: z.object({
      eyebrow: optionalEyebrowSchema,
      title: z.string().min(1),
      textBlock1: z.string().nullable().optional(),
      textBlock2: z.string().nullable().optional(),
      backgroundColor: z.string().nullable().optional(),
      textColor: z.string().nullable().optional(),
      spacing: z.enum(["S", "M", "L", "XL"]),
    }),
    naboryPreview: previewSchema,
    tovaryPreview: previewSchema.extend({ linkLabel: z.string().min(1) }),
  }),
});

export type HomeImage = {
  url: string;
  alt: string;
  width: number;
  height: number;
  sources: Array<{ url: string; width: number }>;
};

export type HomePageContent = {
  seo?: {
    title: string;
    description: string;
    imageUrl?: string;
  };
  hero: {
    eyebrow?: string;
    title: string;
    text: string;
    layout: "50/50" | "40/60" | "100/0";
    image?: HomeImage;
    backgroundColor: string;
    textColor: string;
    cta?: { label: string; url: string };
  };
  about: {
    eyebrow?: string;
    title: string;
    textBlocks: string[];
    backgroundColor?: string;
    textColor?: string;
    spacing: "S" | "M" | "L" | "XL";
  };
  naboryPreview: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    linkLabel: string;
  };
  tovaryPreview: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    linkLabel: string;
  };
};

export function mapHomeCollectionsPayload(
  payload: unknown,
  publicBase: string,
) {
  const parsed = z
    .object({
      data: z.object({
        featuredNabory: z.array(z.unknown()),
        featuredTovary: z.array(z.unknown()),
      }),
    })
    .safeParse(payload);

  if (!parsed.success) throw new CmsValidationError(parsed.error.message);

  return {
    nabory: mapProductsPayload(
      { data: parsed.data.data.featuredNabory },
      publicBase,
    ),
    tovary: mapProductsPayload(
      { data: parsed.data.data.featuredTovary },
      publicBase,
    ),
  };
}

function optionalEyebrow(value: string | null | undefined) {
  const eyebrow = value?.trim();
  return eyebrow ? { eyebrow } : {};
}

function mapImage(value: z.infer<typeof imageSchema>, base: string): HomeImage {
  const sources = Object.values(value.image.formats ?? {}).map((format) => ({
    url: versionCmsMediaUrl(format.url, base, value.image.updatedAt),
    width: format.width,
  }));
  return {
    url: versionCmsMediaUrl(value.image.url, base, value.image.updatedAt),
    alt: value.alt?.trim() ? value.alt : "",
    width: value.image.width,
    height: value.image.height,
    sources,
  };
}

export function mapHomePagePayload(
  payload: unknown,
  publicBase: string,
): HomePageContent {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) throw new CmsValidationError(parsed.error.message);
  const { hero, about, naboryPreview, tovaryPreview, seo } = parsed.data.data;

  return {
    ...(seo
      ? {
          seo: {
            title: seo.title,
            description: seo.description,
            ...(seo.image
              ? {
                  imageUrl: versionCmsMediaUrl(
                    seo.image.url,
                    publicBase,
                    seo.image.updatedAt,
                  ),
                }
              : {}),
          },
        }
      : {}),
    hero: {
      ...optionalEyebrow(hero.eyebrow),
      title: hero.title,
      text: hero.text,
      layout: hero.layout,
      ...(hero.layout !== "100/0" && hero.image
        ? { image: mapImage(hero.image, publicBase) }
        : {}),
      backgroundColor: hero.backgroundColor || DEFAULT_HERO_COLORS.background,
      textColor: hero.textColor || DEFAULT_HERO_COLORS.text,
      ...(hero.cta ? { cta: hero.cta } : {}),
    },
    about: {
      ...optionalEyebrow(about.eyebrow),
      title: about.title,
      textBlocks: [about.textBlock1, about.textBlock2].flatMap((text) =>
        text?.trim() ? [text.trim()] : [],
      ),
      ...(about.backgroundColor
        ? { backgroundColor: about.backgroundColor }
        : {}),
      ...(about.textColor ? { textColor: about.textColor } : {}),
      spacing: about.spacing,
    },
    naboryPreview: {
      ...optionalEyebrow(naboryPreview.eyebrow),
      title: naboryPreview.title,
      ...(naboryPreview.subtitle ? { subtitle: naboryPreview.subtitle } : {}),
      linkLabel: naboryPreview.linkLabel?.trim() || "Все ритуалы",
    },
    tovaryPreview: {
      ...optionalEyebrow(tovaryPreview.eyebrow),
      title: tovaryPreview.title,
      ...(tovaryPreview.subtitle ? { subtitle: tovaryPreview.subtitle } : {}),
      linkLabel: tovaryPreview.linkLabel,
    },
  };
}
