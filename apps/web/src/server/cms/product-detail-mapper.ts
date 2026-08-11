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
    .object({
      large: z
        .object({
          url: z.string().min(1),
          width: z.number().int().positive(),
          height: z.number().int().positive(),
        })
        .optional(),
      medium: z
        .object({
          url: z.string().min(1),
          width: z.number().int().positive(),
          height: z.number().int().positive(),
        })
        .optional(),
      small: z
        .object({
          url: z.string().min(1),
          width: z.number().int().positive(),
          height: z.number().int().positive(),
        })
        .optional(),
      thumbnail: z
        .object({
          url: z.string().min(1),
          width: z.number().int().positive(),
          height: z.number().int().positive(),
        })
        .optional(),
    })
    .nullable()
    .optional(),
});

const imageWithAltSchema = z.object({
  alt: z.string().min(1),
  image: mediaSchema,
});
const seoSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  image: z
    .object({
      url: z.string().min(1),
    })
    .nullable()
    .optional(),
});

const productDetailRecordSchema = z.object({
  documentId: z.string().min(1),
  slug: z.string().min(1),
  type: z.enum(["tovar", "nabor"]),
  displayName: z.string().min(1),
  breadcrumbLabel: z.string().nullable().optional(),
  categoryLabel: z.string().nullable().optional(),
  originalTitle: z.string().min(1).nullable().optional(),
  packageLabel: z.string().min(1),
  price: z.number().int().positive(),
  currency: z.literal("RUB"),
  stock: z.number().int().nonnegative(),
  cardExcerpt: z.string().min(1),
  story: z.string().min(1),
  articles: z
    .array(
      z.object({
        content: z.array(z.unknown()),
      }),
    )
    .optional()
    .default([]),
  seo: seoSchema.nullable().optional(),
  mainImage: imageWithAltSchema.nullable().optional(),
  gallery: z.array(imageWithAltSchema).optional().default([]),
});

const productDetailResponseSchema = z.object({
  data: z.array(productDetailRecordSchema).max(1),
});

export type ProductDetailImage = {
  url: string;
  thumbnailUrl: string;
  sources: Array<{ url: string; width: number }>;
  alt: string;
  width: number;
  height: number;
};

export type ProductDetail = {
  id: string;
  slug: string;
  type: "tovar" | "nabor";
  title: string;
  breadcrumbLabel: string;
  categoryLabel: string;
  originalTitle?: string;
  packageLabel: string;
  priceRubles: number;
  currency: "RUB";
  stock: number;
  inStock: boolean;
  excerpt: string;
  story: string;
  seo?: {
    title: string;
    description: string;
    imageUrl?: string;
  };
  articles: RichContentBlock[][];
  images: ProductDetailImage[];
};

function getMediaUrl(path: string, publicBase: string) {
  if (URL.canParse(path)) return path;
  return new URL(path, publicBase).toString();
}

function mapImage(
  value: z.infer<typeof imageWithAltSchema>,
  publicBase: string,
): ProductDetailImage {
  const display =
    value.image.formats?.large ?? value.image.formats?.medium ?? value.image;
  const thumbnail =
    value.image.formats?.thumbnail ?? value.image.formats?.small ?? display;

  return {
    url: getMediaUrl(display.url, publicBase),
    thumbnailUrl: getMediaUrl(thumbnail.url, publicBase),
    sources: [
      value.image.formats?.thumbnail,
      value.image.formats?.small,
      value.image.formats?.medium,
      value.image.formats?.large,
      value.image,
    ].flatMap((source) =>
      source
        ? [{ url: getMediaUrl(source.url, publicBase), width: source.width }]
        : [],
    ),
    alt: value.alt,
    width: display.width,
    height: display.height,
  };
}

export function mapProductDetailPayload(
  payload: unknown,
  publicBase: string,
): ProductDetail | null {
  const parsed = productDetailResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new CmsValidationError(parsed.error.message);
  }

  const record = parsed.data.data[0];
  if (!record) return null;

  const images = [
    ...(record.mainImage ? [mapImage(record.mainImage, publicBase)] : []),
    ...record.gallery.map((image) => mapImage(image, publicBase)),
  ];

  return {
    id: record.documentId,
    slug: record.slug,
    type: record.type,
    title: record.displayName,
    breadcrumbLabel: record.breadcrumbLabel?.trim() || record.displayName,
    categoryLabel:
      record.categoryLabel?.trim() ||
      (record.type === "tovar" ? "товар" : "набор"),
    ...(record.originalTitle ? { originalTitle: record.originalTitle } : {}),
    packageLabel: record.packageLabel,
    priceRubles: record.price,
    currency: record.currency,
    stock: record.stock,
    inStock: record.stock > 0,
    excerpt: record.cardExcerpt,
    story: record.story,
    ...(record.seo
      ? {
          seo: {
            title: record.seo.title,
            description: record.seo.description,
            ...(record.seo.image
              ? {
                  imageUrl: getMediaUrl(record.seo.image.url, publicBase),
                }
              : {}),
          },
        }
      : {}),
    articles: record.articles
      .map((article) => normalizeStrapiBlocks(article.content, publicBase))
      .filter((content) => content.length > 0),
    images,
  };
}
