import { z } from "zod";

import { safeHtmlToText } from "../../lib/html/safe-html.ts";
import { CmsValidationError } from "./errors.ts";
import { versionCmsMediaUrl } from "./media-url.ts";

type ListingRecord = {
  documentId: string;
  name: string;
  slug: string;
  priority?: number | null;
  image?: unknown;
  content?: unknown;
};

const listingRecordSchema = z.object({
  documentId: z.string().min(1),
  name: z.string().trim().min(1),
  slug: z.string().min(1),
  priority: z.number().int().nullable().optional(),
  image: z.unknown().optional(),
  content: z.unknown().optional(),
});

const detailRecordSchema = listingRecordSchema.extend({
  blocks: z.unknown().optional(),
  relatedMaterials: z.unknown().optional(),
  seo: z.unknown().optional(),
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
  content?: string;
};

export type ArticleRelatedItem = {
  type: "product" | "ritual" | "article";
  id: string;
  slug: string;
  name: string;
  image?: ArticleImage;
  description?: string;
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
  gridRowsStart?: number;
  gridRowsSpan: number;
  gridColumnsStart?: number;
  gridColumnsSpan: number;
};

export type ArticleCardsGrid = {
  component: "article.cards-grid";
  title?: string;
  description?: string;
  titleColor?: string;
  gridColumns: number;
  cards: ArticleGridCard[];
};

export type ArticleDetail = ArticleCard & {
  blocks: ArticleCardsGrid[];
  relatedMaterials: ArticleRelatedItem[];
  seo?: {
    title: string;
    description: string;
    imageUrl?: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapData(value: unknown): unknown {
  if (!isRecord(value) || !("data" in value)) return value;
  return value.data;
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function pick(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function asTitle(value: unknown): string | undefined {
  if (typeof value === "string") return asTrimmedString(value);
  return normalizeArticleHtml(value);
}

function componentId(value: Record<string, unknown>) {
  return (asTrimmedString(value.__component) ?? "").toLowerCase();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineToHtml(nodes: unknown): string {
  if (!Array.isArray(nodes)) return "";

  return nodes
    .map((node) => {
      if (!isRecord(node)) return "";
      if (node.type === "text" && typeof node.text === "string") {
        let html = escapeHtml(node.text);
        if (node.bold === true) html = `<strong>${html}</strong>`;
        if (node.italic === true) html = `<em>${html}</em>`;
        if (node.underline === true) html = `<u>${html}</u>`;
        return html;
      }
      if (node.type === "link") {
        const href = asTrimmedString(node.url) ?? asTrimmedString(node.href);
        const children = inlineToHtml(node.children);
        return href
          ? `<a href="${escapeHtml(href)}">${children}</a>`
          : children;
      }
      return inlineToHtml(node.children);
    })
    .join("");
}

function blocksToHtml(blocks: unknown): string | undefined {
  if (!Array.isArray(blocks)) return undefined;

  const html = blocks
    .map((block) => {
      if (!isRecord(block)) return "";
      const children = inlineToHtml(block.children);
      switch (block.type) {
        case "heading": {
          const level =
            block.level === 3 || block.level === 4 ? block.level : 2;
          return `<h${level}>${children}</h${level}>`;
        }
        case "list": {
          const tag =
            block.format === "ordered" || block.ordered === true ? "ol" : "ul";
          const items = Array.isArray(block.children)
            ? block.children
                .map(
                  (item) =>
                    `<li>${inlineToHtml(isRecord(item) ? item.children : [])}</li>`,
                )
                .join("")
            : "";
          return `<${tag}>${items}</${tag}>`;
        }
        case "quote":
          return `<blockquote>${children}</blockquote>`;
        case "paragraph":
        default:
          return children ? `<p>${children}</p>` : "";
      }
    })
    .join("");

  return html.trim() || undefined;
}

export function normalizeArticleHtml(value: unknown): string | undefined {
  if (typeof value === "string") return asTrimmedString(value);
  if (Array.isArray(value)) return blocksToHtml(value);
  return undefined;
}

function asHexColor(value: unknown): string | undefined {
  if (typeof value === "string") {
    const color = value.trim();
    return /^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(color)
      ? color
      : undefined;
  }
  if (isRecord(value)) {
    return asHexColor(value.hex ?? value.color);
  }
  return undefined;
}

function asPositiveInt(value: unknown, fallback: number) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  return Number.isInteger(numeric) && numeric > 0 ? numeric : fallback;
}

function asOptionalGridStart(value: unknown) {
  const start = asPositiveInt(value, 1);
  return start > 1 ? start : undefined;
}

function asBoolean(value: unknown) {
  return value === true || value === "true";
}

function mapMedia(
  value: unknown,
  publicBase: string,
  fallbackAlt = "",
): ArticleImage | undefined {
  const media = unwrapData(value);
  if (!isRecord(media)) return undefined;
  const url = asTrimmedString(media.url);
  if (!url) return undefined;
  const updatedAt = asTrimmedString(media.updatedAt);
  const formats = isRecord(media.formats) ? Object.values(media.formats) : [];

  return {
    url: versionCmsMediaUrl(url, publicBase, updatedAt),
    alt: asTrimmedString(media.alternativeText) || fallbackAlt,
    ...(typeof media.width === "number" ? { width: media.width } : {}),
    ...(typeof media.height === "number" ? { height: media.height } : {}),
    sources: formats.flatMap((format) => {
      if (!isRecord(format) || typeof format.url !== "string") return [];
      if (typeof format.width !== "number") return [];
      return [
        {
          url: versionCmsMediaUrl(format.url, publicBase, updatedAt),
          width: format.width,
        },
      ];
    }),
  };
}

function mapImageWithAlt(
  value: unknown,
  publicBase: string,
  fallbackAlt: string,
): ArticleImage | undefined {
  const imageWithAlt = unwrapData(value);
  if (!isRecord(imageWithAlt)) return undefined;
  const image = mapMedia(imageWithAlt.image, publicBase, fallbackAlt);
  if (!image) return undefined;
  return {
    ...image,
    alt: asTrimmedString(imageWithAlt.alt) ?? image.alt,
  };
}

function mapRelatedProduct(
  value: Record<string, unknown>,
  publicBase: string,
): ArticleRelatedItem | undefined {
  const relation = unwrapData(value.product);
  if (!isRecord(relation)) return undefined;

  const id = asTrimmedString(relation.documentId);
  const slug = asTrimmedString(relation.slug);
  const name = asTrimmedString(relation.displayName);
  const productType = asTrimmedString(relation.type);
  if (
    !id ||
    !slug ||
    !name ||
    (productType !== "tovar" && productType !== "nabor")
  ) {
    return undefined;
  }

  const image = mapImageWithAlt(relation.mainImage, publicBase, name);
  const description = asTrimmedString(relation.cardExcerpt);

  return {
    type: productType === "nabor" ? "ritual" : "product",
    id,
    slug,
    name,
    ...(image ? { image } : {}),
    ...(description ? { description } : {}),
  };
}

function mapRelatedArticle(
  value: Record<string, unknown>,
  publicBase: string,
): ArticleRelatedItem | undefined {
  const relation = unwrapData(value.article);
  if (!isRecord(relation)) return undefined;

  const id = asTrimmedString(relation.documentId);
  const slug = asTrimmedString(relation.slug);
  const name = asTrimmedString(relation.name);
  if (!id || !slug || !name) return undefined;

  const image = mapMedia(relation.image, publicBase, name);
  const content = normalizeArticleHtml(relation.content);
  const description = content ? safeHtmlToText(content) : undefined;

  return {
    type: "article",
    id,
    slug,
    name,
    ...(image ? { image } : {}),
    ...(description ? { description } : {}),
  };
}

function mapRelatedItems(
  value: unknown,
  publicBase: string,
): ArticleRelatedItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    switch (componentId(item)) {
      case "article.related-product": {
        const mapped = mapRelatedProduct(item, publicBase);
        return mapped ? [mapped] : [];
      }
      case "article.related-article": {
        const mapped = mapRelatedArticle(item, publicBase);
        return mapped ? [mapped] : [];
      }
      default:
        return [];
    }
  });
}

function mapSeo(value: unknown, publicBase: string) {
  if (!isRecord(value)) return undefined;
  const title = asTrimmedString(value.title);
  const description = asTrimmedString(value.description);
  if (!title || !description) return undefined;
  const image = mapMedia(value.image, publicBase);

  return {
    title,
    description,
    ...(image ? { imageUrl: image.url } : {}),
  };
}

function mapGridCard(value: unknown, publicBase: string): ArticleGridCard {
  const card = isRecord(value) ? value : {};
  const titleHtmlTagRaw = pick(card, "titleHtmlTag", "title_html_tag");
  const titleHtmlTag =
    titleHtmlTagRaw === "h2" ||
    titleHtmlTagRaw === "h3" ||
    titleHtmlTagRaw === "h4" ||
    titleHtmlTagRaw === "p"
      ? titleHtmlTagRaw
      : "h3";
  const bulletPositionRaw = pick(card, "bulletPosition", "bullet_position");
  const bulletPosition =
    bulletPositionRaw === "right" ||
    bulletPositionRaw === "top" ||
    bulletPositionRaw === "bottom"
      ? bulletPositionRaw
      : "left";
  const bulletAlignRaw = pick(card, "bulletAlign", "bullet_align");
  const bulletAlign =
    bulletAlignRaw === "center" || bulletAlignRaw === "end"
      ? bulletAlignRaw
      : "start";
  const imagePositionRaw = pick(card, "imagePosition", "image_position");
  const imagePosition =
    imagePositionRaw === "top" ||
    imagePositionRaw === "left" ||
    imagePositionRaw === "right"
      ? imagePositionRaw
      : "bottom";
  const imageFit =
    pick(card, "imageFit", "image_fit") === "cover" ? "cover" : "contain";
  const imageAlignRaw = pick(card, "imageAlign", "image_align");
  const imageAlign =
    imageAlignRaw === "start" || imageAlignRaw === "end"
      ? imageAlignRaw
      : "center";
  const title = asTitle(pick(card, "title"));
  const description = normalizeArticleHtml(pick(card, "description"));
  const titleColor = asHexColor(pick(card, "titleColor", "title_color"));
  const descriptionColor = asHexColor(
    pick(card, "descriptionColor", "description_color"),
  );
  const descriptionLinksColor = asHexColor(
    pick(card, "descriptionLinksColor", "description_links_color"),
  );
  const bgColor = asHexColor(pick(card, "bgColor", "bg_color"));
  const borderColor = asHexColor(pick(card, "borderColor", "border_color"));
  const bulletIcon = mapMedia(
    pick(card, "bulletIcon", "bullet_icon"),
    publicBase,
  );
  const bulletText = asTrimmedString(pick(card, "bulletText", "bullet_text"));
  const bulletTextColor = asHexColor(
    pick(card, "bulletTextColor", "bullet_text_color"),
  );
  const bulletBgColor = asHexColor(
    pick(card, "bulletBgColor", "bullet_bg_color"),
  );
  const imageAlt = asTrimmedString(pick(card, "imageAlt", "image_alt")) ?? "";
  const image = mapMedia(pick(card, "image"), publicBase, imageAlt);
  const gridRowsStart = asOptionalGridStart(
    pick(card, "gridRowsStart", "grid_rows_start"),
  );
  const gridColumnsStart = asOptionalGridStart(
    pick(card, "gridColumnsStart", "grid_columns_start"),
  );

  return {
    ...(title ? { title } : {}),
    titleHtmlTag,
    ...(description ? { description } : {}),
    ...(titleColor ? { titleColor } : {}),
    ...(descriptionColor ? { descriptionColor } : {}),
    ...(descriptionLinksColor ? { descriptionLinksColor } : {}),
    ...(bgColor ? { bgColor } : {}),
    ...(borderColor ? { borderColor } : {}),
    ...(bulletIcon ? { bulletIcon } : {}),
    ...(bulletText ? { bulletText } : {}),
    ...(bulletTextColor ? { bulletTextColor } : {}),
    ...(bulletBgColor ? { bulletBgColor } : {}),
    bulletPosition,
    bulletAlign,
    bulletScalePercent: asPositiveInt(
      pick(card, "bulletScalePercent", "bullet_scale_percent"),
      100,
    ),
    bulletDisabledBg: asBoolean(
      pick(card, "bulletDisabledBg", "bullet_disabled_bg"),
    ),
    bulletDisabledPaddings: asBoolean(
      pick(card, "bulletDisabledPaddings", "bullet_disabled_paddings"),
    ),
    ...(image ? { image } : {}),
    imagePosition,
    imageFit,
    imageAlign,
    imageScalePercent: asPositiveInt(
      pick(card, "imageScalePercent", "image_scale_percent"),
      100,
    ),
    disabledBg: asBoolean(pick(card, "disabledBg", "disabled_bg")),
    disabledPaddings: asBoolean(
      pick(card, "disabledPaddings", "disabled_paddings"),
    ),
    ...(gridRowsStart ? { gridRowsStart } : {}),
    gridRowsSpan: asPositiveInt(
      pick(card, "gridRowsSpan", "grid_rows_span"),
      1,
    ),
    ...(gridColumnsStart ? { gridColumnsStart } : {}),
    gridColumnsSpan: asPositiveInt(
      pick(card, "gridColumnsSpan", "grid_columns_span"),
      1,
    ),
  };
}

function isCardsGridBlock(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const component = componentId(value);
  return (
    component.endsWith("cards-grid") ||
    component.endsWith(".cardsgrid") ||
    Array.isArray(value.cards)
  );
}

function isBasicInfoCard(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const component = componentId(value);
  return (
    component.includes("basic-info-card") || component.endsWith("basicinfocard")
  );
}

function mapCardsGrid(
  value: Record<string, unknown>,
  publicBase: string,
): ArticleCardsGrid {
  const cards = Array.isArray(value.cards) ? value.cards : [];
  const title = asTitle(pick(value, "title"));
  const description = normalizeArticleHtml(pick(value, "description"));
  const titleColor = asHexColor(pick(value, "titleColor", "title_color"));
  return {
    component: "article.cards-grid",
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(titleColor ? { titleColor } : {}),
    gridColumns: Math.min(
      6,
      asPositiveInt(pick(value, "gridColumns", "grid_columns"), 3),
    ),
    cards: cards.map((card) => mapGridCard(card, publicBase)),
  };
}

function mapBlocks(value: unknown, publicBase: string): ArticleCardsGrid[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((block) => {
    if (isCardsGridBlock(block)) return [mapCardsGrid(block, publicBase)];
    if (isBasicInfoCard(block)) {
      return [mapCardsGrid({ cards: [block], grid_columns: 2 }, publicBase)];
    }
    return [];
  });
}

function mapArticleCard(
  record: ListingRecord,
  publicBase: string,
): ArticleCard {
  const image = mapMedia(record.image, publicBase, record.name);
  const content = normalizeArticleHtml(record.content);

  return {
    id: record.documentId,
    name: record.name,
    slug: record.slug,
    priority: record.priority ?? 0,
    ...(image ? { image } : {}),
    ...(content ? { content } : {}),
  };
}

export function articlesListRequest() {
  const query = new URLSearchParams({
    status: "published",
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
    "sort[0]": "priority:desc",
    "sort[1]": "name:asc",
    "pagination[pageSize]": "100",
  });

  return {
    path: `/api/articles?${query}`,
    tags: ["articles"],
  } as const;
}

const MEDIA_FIELDS = [
  "url",
  "width",
  "height",
  "formats",
  "updatedAt",
  "alternativeText",
] as const;

function appendMediaPopulate(query: URLSearchParams, prefix: string) {
  MEDIA_FIELDS.forEach((field, index) => {
    query.set(`${prefix}[fields][${index}]`, field);
  });
}

export function appendCardsGridPopulateToQuery(query: URLSearchParams) {
  appendCardsGridPopulate(query, "article.cards-grid", ["image", "bulletIcon"]);
  appendCardsGridPopulate(query, "material-templates.cards-grid", [
    "image",
    "bullet_icon",
  ]);
}

function appendCardsGridPopulate(
  query: URLSearchParams,
  component: string,
  mediaFields: readonly string[],
) {
  const base = `populate[blocks][on][${component}][populate][cards][populate]`;
  for (const mediaField of mediaFields) {
    appendMediaPopulate(query, `${base}[${mediaField}]`);
  }
}

function appendRelatedProductPopulate(query: URLSearchParams) {
  const base =
    "populate[relatedMaterials][on][article.related-product][populate][product]";
  ["displayName", "slug", "cardExcerpt", "type"].forEach((field, index) => {
    query.set(`${base}[fields][${index}]`, field);
  });
  query.set(`${base}[populate][mainImage][fields][0]`, "alt");
  appendMediaPopulate(query, `${base}[populate][mainImage][populate][image]`);
}

function appendRelatedArticlePopulate(query: URLSearchParams) {
  const base =
    "populate[relatedMaterials][on][article.related-article][populate][article]";
  ["name", "slug", "content"].forEach((field, index) => {
    query.set(`${base}[fields][${index}]`, field);
  });
  appendMediaPopulate(query, `${base}[populate][image]`);
}

export function articleDetailRequest(slug: string) {
  const query = new URLSearchParams({
    status: "published",
    "filters[slug][$eq]": slug,
    "fields[0]": "name",
    "fields[1]": "slug",
    "fields[2]": "priority",
    "fields[3]": "content",
    "pagination[pageSize]": "1",
  });
  appendMediaPopulate(query, "populate[image]");
  query.set("populate[seo][fields][0]", "title");
  query.set("populate[seo][fields][1]", "description");
  appendMediaPopulate(query, "populate[seo][populate][image]");
  // Strapi 5 rejects populate[blocks][populate] on a dynamic zone; use on[uid].
  appendCardsGridPopulateToQuery(query);
  appendRelatedProductPopulate(query);
  appendRelatedArticlePopulate(query);

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

  return parsed.data.data.map((record) => mapArticleCard(record, publicBase));
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
  const content = normalizeArticleHtml(record.content);
  const seo = mapSeo(record.seo, publicBase);

  return {
    ...mapArticleCard(record, publicBase),
    ...(content ? { content } : {}),
    blocks: mapBlocks(record.blocks, publicBase),
    relatedMaterials: mapRelatedItems(record.relatedMaterials, publicBase),
    ...(seo ? { seo } : {}),
  };
}
