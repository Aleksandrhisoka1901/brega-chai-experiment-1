import {
  productSummarySchema,
  type ProductSummary,
} from "@brega-chai/contracts";
import { z } from "zod";

import { CmsValidationError } from "./errors.ts";
import { versionCmsMediaUrl } from "./media-url.ts";

const mediaSchema = z.object({
  url: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
  alternativeText: z.string().nullable().optional(),
  formats: z
    .object({
      small: z
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

const productRecordSchema = z.object({
  documentId: z.string().min(1),
  slug: z.string().min(1),
  type: z.enum(["tovar", "nabor"]),
  displayName: z.string().min(1),
  packageLabel: z.string().min(1),
  price: z.number().int().positive(),
  stock: z.number().int().nonnegative(),
  cardExcerpt: z.string().min(1),
  mainImage: z
    .object({
      alt: z.string().nullable().optional(),
      image: mediaSchema.nullable().optional(),
    })
    .nullable()
    .optional(),
});

const productsResponseSchema = z.object({
  data: z.array(productRecordSchema),
});

const catalogProductsResponseSchema = productsResponseSchema.extend({
  meta: z.object({
    pagination: z.object({
      start: z.number().int().nonnegative(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
    }),
  }),
});

function mapProduct(
  record: z.infer<typeof productRecordSchema>,
  publicBase: string,
): ProductSummary {
  const image = record.mainImage?.image;
  const cardImage = image;
  const imageSources = image
    ? [
        image.formats?.thumbnail,
        image.formats?.small,
        image.formats?.medium,
        image,
      ].flatMap((source) =>
        source
          ? [
              {
                url: versionCmsMediaUrl(
                  source.url,
                  publicBase,
                  image.updatedAt,
                ),
                width: source.width,
              },
            ]
          : [],
      )
    : [];

  return productSummarySchema.parse({
    id: record.documentId,
    slug: record.slug,
    type: record.type,
    title: record.displayName,
    packageLabel: record.packageLabel,
    priceRubles: record.price,
    excerpt: record.cardExcerpt,
    inStock: record.stock > 0,
    imageUrl: cardImage
      ? versionCmsMediaUrl(cardImage.url, publicBase, image?.updatedAt)
      : undefined,
    imageAlt: image
      ? (record.mainImage?.alt?.trim() ?? image.alternativeText?.trim() ?? "")
      : undefined,
    imageSources: imageSources.length > 0 ? imageSources : undefined,
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

export function mapCatalogProductsPayload(
  payload: unknown,
  publicBase: string,
) {
  const parsed = catalogProductsResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new CmsValidationError(parsed.error.message);
  }

  return {
    products: parsed.data.data.map((record) => mapProduct(record, publicBase)),
    totalItems: parsed.data.meta.pagination.total,
  };
}
