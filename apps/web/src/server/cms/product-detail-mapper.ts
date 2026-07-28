import { z } from "zod";

import { CmsValidationError } from "./errors.ts";

const mediaSchema = z.object({
  url: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const imageWithAltSchema = z.object({
  alt: z.string().min(1),
  image: mediaSchema,
});

const productDetailRecordSchema = z.object({
  documentId: z.string().min(1),
  slug: z.string().min(1),
  type: z.enum(["product", "ritual"]),
  title: z.string().min(1),
  originalTitle: z.string().min(1).nullable().optional(),
  packageLabel: z.string().min(1),
  price: z.number().int().positive(),
  currency: z.literal("RUB"),
  stock: z.number().int().nonnegative(),
  cardExcerpt: z.string().min(1),
  story: z.string().min(1),
  mainImage: imageWithAltSchema.nullable().optional(),
  gallery: z.array(imageWithAltSchema).optional().default([]),
});

const productDetailResponseSchema = z.object({
  data: z.array(productDetailRecordSchema).max(1),
});

export type ProductDetailImage = {
  url: string;
  alt: string;
  width: number;
  height: number;
};

export type ProductDetail = {
  id: string;
  slug: string;
  type: "product" | "ritual";
  title: string;
  originalTitle?: string;
  packageLabel: string;
  priceRubles: number;
  currency: "RUB";
  stock: number;
  inStock: boolean;
  excerpt: string;
  story: string;
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
  return {
    url: getMediaUrl(value.image.url, publicBase),
    alt: value.alt,
    width: value.image.width,
    height: value.image.height,
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
    title: record.title,
    ...(record.originalTitle ? { originalTitle: record.originalTitle } : {}),
    packageLabel: record.packageLabel,
    priceRubles: record.price,
    currency: record.currency,
    stock: record.stock,
    inStock: record.stock > 0,
    excerpt: record.cardExcerpt,
    story: record.story,
    images,
  };
}
