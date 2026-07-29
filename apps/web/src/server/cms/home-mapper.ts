import { z } from "zod";

import { CmsValidationError } from "./errors.ts";

const mediaSchema = z.object({
  url: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
const imageSchema = z.object({ alt: z.string().min(1), image: mediaSchema });
const linkSchema = z.object({
  label: z.string().min(1),
  url: z.string().min(1),
});
const textNodeSchema = z.object({ type: z.literal("text"), text: z.string() });
const paragraphSchema = z.object({
  type: z.literal("paragraph"),
  children: z.array(textNodeSchema),
});
const previewSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1).nullable().optional(),
});
const responseSchema = z.object({
  data: z.object({
    hero: z.object({
      title: z.string().min(1),
      text: z.string().min(1),
      layout: z.enum(["50/50", "40/60", "100/0"]),
      image: imageSchema.nullable().optional(),
      backgroundColor: z.string().nullable().optional(),
      textColor: z.string().nullable().optional(),
      cta: linkSchema.nullable().optional(),
    }),
    about: z.object({
      text: z.array(paragraphSchema).min(1),
      image: imageSchema.nullable().optional(),
      backgroundColor: z.string().nullable().optional(),
      textColor: z.string().nullable().optional(),
      spacing: z.enum(["S", "M", "L", "XL"]),
    }),
    ritualsPreview: previewSchema,
    productsPreview: previewSchema,
  }),
});

export type HomeImage = {
  url: string;
  alt: string;
  width: number;
  height: number;
};

export type HomePageContent = {
  hero: {
    title: string;
    text: string;
    layout: "50/50" | "40/60" | "100/0";
    image?: HomeImage;
    backgroundColor?: string;
    textColor?: string;
    cta?: { label: string; url: string };
  };
  about: {
    paragraphs: string[];
    image?: HomeImage;
    backgroundColor?: string;
    textColor?: string;
    spacing: "S" | "M" | "L" | "XL";
  };
  ritualsPreview: { title: string; subtitle?: string };
  productsPreview: { title: string; subtitle?: string };
};

function mediaUrl(path: string, base: string) {
  return URL.canParse(path) ? path : new URL(path, base).toString();
}

function mapImage(value: z.infer<typeof imageSchema>, base: string): HomeImage {
  return {
    url: mediaUrl(value.image.url, base),
    alt: value.alt,
    width: value.image.width,
    height: value.image.height,
  };
}

export function mapHomePagePayload(
  payload: unknown,
  publicBase: string,
): HomePageContent {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) throw new CmsValidationError(parsed.error.message);
  const { hero, about, ritualsPreview, productsPreview } = parsed.data.data;

  return {
    hero: {
      title: hero.title,
      text: hero.text,
      layout: hero.layout,
      ...(hero.layout !== "100/0" && hero.image
        ? { image: mapImage(hero.image, publicBase) }
        : {}),
      ...(hero.backgroundColor
        ? { backgroundColor: hero.backgroundColor }
        : {}),
      ...(hero.textColor ? { textColor: hero.textColor } : {}),
      ...(hero.cta ? { cta: hero.cta } : {}),
    },
    about: {
      paragraphs: about.text.map((paragraph) =>
        paragraph.children.map((node) => node.text).join(""),
      ),
      ...(about.image ? { image: mapImage(about.image, publicBase) } : {}),
      ...(about.backgroundColor
        ? { backgroundColor: about.backgroundColor }
        : {}),
      ...(about.textColor ? { textColor: about.textColor } : {}),
      spacing: about.spacing,
    },
    ritualsPreview: {
      title: ritualsPreview.title,
      ...(ritualsPreview.subtitle ? { subtitle: ritualsPreview.subtitle } : {}),
    },
    productsPreview: {
      title: productsPreview.title,
      ...(productsPreview.subtitle
        ? { subtitle: productsPreview.subtitle }
        : {}),
    },
  };
}
