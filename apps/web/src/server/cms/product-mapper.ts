import {
  productSummarySchema,
  type ProductSummary,
} from "@brega-chai/contracts";
import { z } from "zod";

import { CmsValidationError } from "./errors.ts";

const mediaSchema = z.object({
  url: z.string().min(1),
  alternativeText: z.string().nullable().optional(),
});

const productRecordSchema = z.object({
  documentId: z.string().min(1),
  slug: z.string().min(1),
  type: z.enum(["product", "ritual"]),
  title: z.string().min(1),
  packageLabel: z.string().min(1),
  price: z.number().int().positive(),
  stock: z.number().int().nonnegative(),
  cardExcerpt: z.string().min(1),
  mainImage: z
    .object({
      alt: z.string().min(1),
      image: mediaSchema.nullable().optional(),
    })
    .nullable()
    .optional(),
});

const productsResponseSchema = z.object({
  data: z.array(productRecordSchema),
});

function getMediaUrl(path: string, publicBase: string) {
  if (URL.canParse(path)) return path;
  return new URL(path, publicBase).toString();
}

function mapProduct(
  record: z.infer<typeof productRecordSchema>,
  publicBase: string,
): ProductSummary {
  const image = record.mainImage?.image;

  return productSummarySchema.parse({
    id: record.documentId,
    slug: record.slug,
    type: record.type,
    title: record.title,
    packageLabel: record.packageLabel,
    priceRubles: record.price,
    excerpt: record.cardExcerpt,
    inStock: record.stock > 0,
    imageUrl: image ? getMediaUrl(image.url, publicBase) : undefined,
    imageAlt: record.mainImage?.alt ?? image?.alternativeText ?? undefined,
  });
}

export function mapProductsPayload(
  payload: unknown,
  publicBase: string,
): ProductSummary[] {
  const parsed = productsResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new CmsValidationError(parsed.error.message);
  }

  return parsed.data.data.map((record) => mapProduct(record, publicBase));
}
