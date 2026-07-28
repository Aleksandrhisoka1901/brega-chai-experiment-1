import type { ProductSummary } from "@brega-chai/contracts";
import { z } from "zod";

import {
  normalizeStrapiBlocks,
  type RichContentBlock,
} from "../../components/rich-content/model.ts";

import { CmsValidationError } from "./errors.ts";

const nonEmptyString = z.string().trim().min(1);
const mediaSchema = z.object({
  url: nonEmptyString,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
const imageSchema = z.object({
  alt: nonEmptyString,
  image: mediaSchema,
});
const seoSchema = z.object({
  title: nonEmptyString,
  description: nonEmptyString,
});
const responseSchema = z.object({
  data: z.object({
    title: nonEmptyString,
    intro: z.array(z.unknown()).min(1),
    image: imageSchema.nullable().optional(),
    seo: seoSchema,
  }),
});

export type ProductsPageImage = {
  url: string;
  alt: string;
  width: number;
  height: number;
};

export type ProductsPageContent = {
  title: string;
  intro: RichContentBlock[];
  image?: ProductsPageImage;
  seo: {
    title: string;
    description: string;
  };
};

export type ProductsPageModel = {
  content: ProductsPageContent | null;
  products: ProductSummary[];
  contentUnavailable: boolean;
  productsUnavailable: boolean;
};

function mediaUrl(path: string, base: string) {
  return URL.canParse(path) ? path : new URL(path, base).toString();
}

export function mapProductsPagePayload(
  payload: unknown,
  publicBase: string,
): ProductsPageContent {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) throw new CmsValidationError(parsed.error.message);

  const { title, intro, image, seo } = parsed.data.data;
  const normalizedIntro = normalizeStrapiBlocks(intro, publicBase);
  if (normalizedIntro.length === 0) {
    throw new CmsValidationError(
      "ProductsPage intro does not contain renderable Blocks content",
    );
  }

  return {
    title,
    intro: normalizedIntro,
    ...(image
      ? {
          image: {
            url: mediaUrl(image.image.url, publicBase),
            alt: image.alt,
            width: image.image.width,
            height: image.image.height,
          },
        }
      : {}),
    seo,
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
    "fields[0]": "title",
    "fields[1]": "intro",
    "populate[seo][fields][0]": "title",
    "populate[seo][fields][1]": "description",
    "populate[image][fields][0]": "alt",
    "populate[image][populate][image][fields][0]": "url",
    "populate[image][populate][image][fields][1]": "width",
    "populate[image][populate][image][fields][2]": "height",
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
