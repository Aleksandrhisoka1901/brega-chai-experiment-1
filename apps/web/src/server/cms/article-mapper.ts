import { z } from "zod";

import { CmsValidationError } from "./errors.ts";
import { versionCmsMediaUrl } from "./media-url.ts";

const optionalString = z
  .string()
  .nullable()
  .optional()
  .transform((value) => value?.trim() || undefined);
const hexColor = z
  .string()
  .nullable()
  .optional()
  .transform((value) => {
    const color = value?.trim();
    return color && /^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(color)
      ? color
      : undefined;
  });
const positiveInt = z
  .number()
  .int()
  .positive()
  .nullable()
  .optional()
  .transform((value) => value ?? undefined);
const mediaSchema = z
  .object({
    url: z.string().min(1),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    alternativeText: z.string().nullable().optional(),
    updatedAt: z.iso.datetime().optional(),
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
  })
  .nullable()
  .optional();
const seoSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    image: z
      .object({
        url: z.string().min(1),
        updatedAt: z.iso.datetime().optional(),
      })
      .nullable()
      .optional(),
  })
  .nullable()
  .optional();

const cardSchema = z.object({
  title: optionalString,
  titleHtmlTag: z
    .enum(["h2", "h3", "h4", "p"])
    .nullish()
    .transform((value) => value ?? "h3"),
  description: optionalString,
  titleColor: hexColor,
  descriptionColor: hexColor,
  descriptionLinksColor: hexColor,
  bgColor: hexColor,
  borderColor: hexColor,
  bulletIcon: mediaSchema,
  bulletText: optionalString,
  bulletTextColor: hexColor,
  bulletBgColor: hexColor,
  bulletPosition: z
    .enum(["left", "right", "top", "bottom"])
    .nullish()
    .transform((value) => value ?? "left"),
  bulletAlign: z
    .enum(["start", "center", "end"])
    .nullish()
    .transform((value) => value ?? "start"),
  bulletScalePercent: z.number().int().min(1).max(300).nullable().optional(),
  bulletDisabledBg: z.boolean().nullable().optional(),
  bulletDisabledPaddings: z.boolean().nullable().optional(),
  image: mediaSchema,
  imageAlt: optionalString,
  imagePosition: z
    .enum(["top", "bottom", "left", "right"])
    .nullish()
    .transform((value) => value ?? "bottom"),
  imageFit: z
    .enum(["contain", "cover"])
    .nullish()
    .transform((value) => value ?? "contain"),
  imageAlign: z
    .enum(["start", "center", "end"])
    .nullish()
    .transform((value) => value ?? "center"),
  imageScalePercent: z.number().int().min(1).max(300).nullable().optional(),
  disabledBg: z.boolean().nullable().optional(),
  disabledPaddings: z.boolean().nullable().optional(),
  gridRowsStart: positiveInt,
  gridRowsSpan: positiveInt,
  gridColumnsStart: positiveInt,
  gridColumnsSpan: positiveInt,
});

const cardsGridSchema = z.object({
  __component: z.literal("article.cards-grid"),
  title: optionalString,
  description: optionalString,
  titleColor: hexColor,
  gridColumns: z.number().int().min(1).max(6).nullable().optional(),
  cards: z.array(cardSchema).optional().default([]),
});

const listingRecordSchema = z.object({
  documentId: z.string().min(1),
  name: z.string().trim().min(1),
  slug: z.string().min(1),
  priority: z.number().int().nullable().optional(),
  image: mediaSchema,
});

const detailRecordSchema = listingRecordSchema.extend({
  content: optionalString,
  blocks: z.array(cardsGridSchema).optional().default([]),
  seo: seoSchema,
});

export type ArticleImage = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  sources: Array<{ url: string; width: number }>;
};

export type ArticleCard = {
  id: string;
  name: string;
  slug: string;
  priority: number;
  image?: ArticleImage;
};

export type ArticleGridCard = {
  title?: string;
  titleHtmlTag: "h2" | "h3" | "h4" | "p";
  description?: string;
  titleColor?: string;
  descriptionColor?: string;
  descriptionLinksColor?: string;
  bgColor?: string;
  borderColor?: string;
  bulletIcon?: ArticleImage;
  bulletText?: string;
  bulletTextColor?: string;
  bulletBgColor?: string;
  bulletPosition: "left" | "right" | "top" | "bottom";
  bulletAlign: "start" | "center" | "end";
  bulletScalePercent: number;
  bulletDisabledBg: boolean;
  bulletDisabledPaddings: boolean;
  image?: ArticleImage;
  imagePosition: "top" | "bottom" | "left" | "right";
  imageFit: "contain" | "cover";
  imageAlign: "start" | "center" | "end";
  imageScalePercent: number;
  disabledBg: boolean;
  disabledPaddings: boolean;
  gridRowsStart: number;
  gridRowsSpan: number;
  gridColumnsStart: number;
  gridColumnsSpan: number;
};

export type ArticleCardsGrid = {
  title?: string;
  description?: string;
  titleColor?: string;
  gridColumns: number;
  cards: ArticleGridCard[];
};

export type ArticleDetail = ArticleCard & {
  content?: string;
  blocks: ArticleCardsGrid[];
  seo?: {
    title: string;
    description: string;
    imageUrl?: string;
  };
};

function mapMedia(
  value: z.infer<typeof mediaSchema>,
  publicBase: string,
  fallbackAlt = "",
): ArticleImage | undefined {
  if (!value) return undefined;

  return {
    url: versionCmsMediaUrl(value.url, publicBase, value.updatedAt),
    alt: value.alternativeText?.trim() || fallbackAlt,
    ...(value.width ? { width: value.width } : {}),
    ...(value.height ? { height: value.height } : {}),
    sources: Object.values(value.formats ?? {}).map((format) => ({
      url: versionCmsMediaUrl(format.url, publicBase, value.updatedAt),
      width: format.width,
    })),
  };
}

function mapCard(
  card: z.infer<typeof cardSchema>,
  publicBase: string,
): ArticleGridCard {
  return {
    ...(card.title ? { title: card.title } : {}),
    titleHtmlTag: card.titleHtmlTag,
    ...(card.description ? { description: card.description } : {}),
    ...(card.titleColor ? { titleColor: card.titleColor } : {}),
    ...(card.descriptionColor
      ? { descriptionColor: card.descriptionColor }
      : {}),
    ...(card.descriptionLinksColor
      ? { descriptionLinksColor: card.descriptionLinksColor }
      : {}),
    ...(card.bgColor ? { bgColor: card.bgColor } : {}),
    ...(card.borderColor ? { borderColor: card.borderColor } : {}),
    ...(mapMedia(card.bulletIcon, publicBase)
      ? { bulletIcon: mapMedia(card.bulletIcon, publicBase) }
      : {}),
    ...(card.bulletText ? { bulletText: card.bulletText } : {}),
    ...(card.bulletTextColor ? { bulletTextColor: card.bulletTextColor } : {}),
    ...(card.bulletBgColor ? { bulletBgColor: card.bulletBgColor } : {}),
    bulletPosition: card.bulletPosition,
    bulletAlign: card.bulletAlign,
    bulletScalePercent: card.bulletScalePercent ?? 100,
    bulletDisabledBg: card.bulletDisabledBg === true,
    bulletDisabledPaddings: card.bulletDisabledPaddings === true,
    ...(mapMedia(card.image, publicBase, card.imageAlt ?? "")
      ? {
          image: mapMedia(card.image, publicBase, card.imageAlt ?? ""),
        }
      : {}),
    imagePosition: card.imagePosition,
    imageFit: card.imageFit,
    imageAlign: card.imageAlign,
    imageScalePercent: card.imageScalePercent ?? 100,
    disabledBg: card.disabledBg === true,
    disabledPaddings: card.disabledPaddings === true,
    gridRowsStart: card.gridRowsStart ?? 1,
    gridRowsSpan: card.gridRowsSpan ?? 1,
    gridColumnsStart: card.gridColumnsStart ?? 1,
    gridColumnsSpan: card.gridColumnsSpan ?? 1,
  };
}

export function articlesListRequest() {
  const query = new URLSearchParams({
    status: "published",
    "fields[0]": "name",
    "fields[1]": "slug",
    "fields[2]": "priority",
    "populate[image][fields][0]": "url",
    "populate[image][fields][1]": "width",
    "populate[image][fields][2]": "height",
    "populate[image][fields][3]": "formats",
    "populate[image][fields][4]": "updatedAt",
    "populate[image][fields][5]": "alternativeText",
    "sort[0]": "priority:desc",
    "sort[1]": "name:asc",
    "pagination[pageSize]": "100",
  });

  return {
    path: `/api/articles?${query}`,
    tags: ["articles"],
  } as const;
}

export function articleDetailRequest(slug: string) {
  const query = new URLSearchParams({
    status: "published",
    "filters[slug][$eq]": slug,
    "fields[0]": "name",
    "fields[1]": "slug",
    "fields[2]": "priority",
    "fields[3]": "content",
    "populate[image][fields][0]": "url",
    "populate[image][fields][1]": "width",
    "populate[image][fields][2]": "height",
    "populate[image][fields][3]": "formats",
    "populate[image][fields][4]": "updatedAt",
    "populate[image][fields][5]": "alternativeText",
    "populate[seo][fields][0]": "title",
    "populate[seo][fields][1]": "description",
    "populate[seo][populate][image][fields][0]": "url",
    "populate[seo][populate][image][fields][1]": "updatedAt",
    "populate[blocks][on][article.cards-grid][fields][0]": "title",
    "populate[blocks][on][article.cards-grid][fields][1]": "description",
    "populate[blocks][on][article.cards-grid][fields][2]": "titleColor",
    "populate[blocks][on][article.cards-grid][fields][3]": "gridColumns",
    "populate[blocks][on][article.cards-grid][populate][cards][populate][image][fields][0]":
      "url",
    "populate[blocks][on][article.cards-grid][populate][cards][populate][image][fields][1]":
      "width",
    "populate[blocks][on][article.cards-grid][populate][cards][populate][image][fields][2]":
      "height",
    "populate[blocks][on][article.cards-grid][populate][cards][populate][image][fields][3]":
      "formats",
    "populate[blocks][on][article.cards-grid][populate][cards][populate][image][fields][4]":
      "updatedAt",
    "populate[blocks][on][article.cards-grid][populate][cards][populate][image][fields][5]":
      "alternativeText",
    "populate[blocks][on][article.cards-grid][populate][cards][populate][bulletIcon][fields][0]":
      "url",
    "populate[blocks][on][article.cards-grid][populate][cards][populate][bulletIcon][fields][1]":
      "width",
    "populate[blocks][on][article.cards-grid][populate][cards][populate][bulletIcon][fields][2]":
      "height",
    "populate[blocks][on][article.cards-grid][populate][cards][populate][bulletIcon][fields][3]":
      "formats",
    "populate[blocks][on][article.cards-grid][populate][cards][populate][bulletIcon][fields][4]":
      "updatedAt",
    "pagination[pageSize]": "1",
  });

  return {
    path: `/api/articles?${query}`,
    tags: ["articles", `article-slug:${slug}`],
  } as const;
}

export function mapArticlesPayload(
  payload: unknown,
  publicBase: string,
): ArticleCard[] {
  const parsed = z
    .object({ data: z.array(listingRecordSchema) })
    .safeParse(payload);
  if (!parsed.success) throw new CmsValidationError(parsed.error.message);

  return parsed.data.data.map((record) => ({
    id: record.documentId,
    name: record.name,
    slug: record.slug,
    priority: record.priority ?? 0,
    ...(mapMedia(record.image, publicBase, record.name)
      ? { image: mapMedia(record.image, publicBase, record.name) }
      : {}),
  }));
}

export function mapArticleDetailPayload(
  payload: unknown,
  publicBase: string,
): ArticleDetail | null {
  const parsed = z
    .object({ data: z.array(detailRecordSchema).max(1) })
    .safeParse(payload);
  if (!parsed.success) throw new CmsValidationError(parsed.error.message);

  const record = parsed.data.data[0];
  if (!record) return null;

  return {
    id: record.documentId,
    name: record.name,
    slug: record.slug,
    priority: record.priority ?? 0,
    ...(mapMedia(record.image, publicBase, record.name)
      ? { image: mapMedia(record.image, publicBase, record.name) }
      : {}),
    ...(record.content ? { content: record.content } : {}),
    blocks: record.blocks.map((block) => ({
      ...(block.title ? { title: block.title } : {}),
      ...(block.description ? { description: block.description } : {}),
      ...(block.titleColor ? { titleColor: block.titleColor } : {}),
      gridColumns: block.gridColumns ?? 3,
      cards: block.cards.map((card) => mapCard(card, publicBase)),
    })),
    ...(record.seo
      ? {
          seo: {
            title: record.seo.title,
            description: record.seo.description,
            ...(record.seo.image
              ? {
                  imageUrl: versionCmsMediaUrl(
                    record.seo.image.url,
                    publicBase,
                    record.seo.image.updatedAt,
                  ),
                }
              : {}),
          },
        }
      : {}),
  };
}
