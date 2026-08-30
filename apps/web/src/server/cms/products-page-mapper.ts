import type { ProductSummary } from "@brega-chai/contracts";
import { z } from "zod";

import { sanitizeEditorialEyebrow } from "./editorial-eyebrow.ts";
import { CmsValidationError } from "./errors.ts";
import { versionCmsMediaUrl } from "./media-url.ts";

const nonEmptyString = z.string().trim().min(1);
const optionalEyebrow = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((value) => sanitizeEditorialEyebrow(value));
const seoSchema = z.object({
  title: nonEmptyString,
  description: nonEmptyString,
  image: z
    .object({
      url: nonEmptyString,
    })
    .nullable()
    .optional(),
});
const responseSchema = z.object({
  data: z.object({
    eyebrow: optionalEyebrow,
    title: nonEmptyString,
    emptyStateText: nonEmptyString,
    emptyStateLinkLabel: nonEmptyString,
    intro: nonEmptyString,
    seo: seoSchema.nullable().optional(),
  }),
});

export type ProductsPageContent = {
  eyebrow?: string;
  title: string;
  emptyStateText: string;
  emptyStateLinkLabel: string;
  intro: string;
  seo?: {
    title: string;
    description: string;
    imageUrl?: string;
  };
};

export type ProductsPageModel = {
  content: ProductsPageContent | null;
  products: ProductSummary[];
  contentUnavailable: boolean;
  productsUnavailable: boolean;
};

function mediaUrl(path: string, base: string) {
  return versionCmsMediaUrl(path, base);
}

export function mapProductsPagePayload(
  payload: unknown,
  publicBase: string,
): ProductsPageContent {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) throw new CmsValidationError(parsed.error.message);

  const { eyebrow, title, emptyStateText, emptyStateLinkLabel, intro, seo } =
    parsed.data.data;

  return {
    ...(eyebrow ? { eyebrow } : {}),
    title,
    emptyStateText,
    emptyStateLinkLabel,
    intro,
    ...(seo
      ? {
          seo: {
            title: seo.title,
            description: seo.description,
            ...(seo.image
              ? { imageUrl: mediaUrl(seo.image.url, publicBase) }
              : {}),
          },
        }
      : {}),
  };
}

export function mapProductsPageLoadResults(
  contentResult: PromiseSettledResult<ProductsPageContent>,
  productsResult: PromiseSettledResult<ProductSummary[]>,
): ProductsPageModel {
  return {
    content: contentResult.status === "fulfilled" ? contentResult.value : null,
    products: productsResult.status === "fulfilled" ? productsResult.value : [],
    contentUnavailable: contentResult.status === "rejected",
    productsUnavailable: productsResult.status === "rejected",
  };
}

export function productsPageRequest() {
  const query = new URLSearchParams({
    status: "published",
    "fields[0]": "eyebrow",
    "fields[1]": "title",
    "fields[2]": "emptyStateText",
    "fields[3]": "emptyStateLinkLabel",
    "fields[4]": "intro",
    "populate[seo][fields][0]": "title",
    "populate[seo][fields][1]": "description",
    "populate[seo][populate][image][fields][0]": "url",
  });

  return {
    path: `/api/products-page?${query}`,
    tags: ["products"],
  } as const;
}

export async function fetchProductsPageContent(
  fetcher: (path: string, options: { tags: string[] }) => Promise<unknown>,
  publicBase: string,
) {
  const request = productsPageRequest();
  const payload = await fetcher(request.path, { tags: [...request.tags] });

  return mapProductsPagePayload(payload, publicBase);
}
