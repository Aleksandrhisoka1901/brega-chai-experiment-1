import { z } from "zod";

import { WHOLESALE_PATH } from "../../lib/storefront-routes.ts";
import {
  appendCardsGridPopulateToQuery,
  mapArticleDetailPayload,
  type ArticleDetail,
} from "./article-mapper.ts";
import { CmsValidationError } from "./errors.ts";

export type WholesalePage = ArticleDetail;

export function wholesalePageRequest() {
  const query = new URLSearchParams({
    status: "published",
    "fields[0]": "title",
    "fields[1]": "content",
  });
  query.set("populate[seo][fields][0]", "title");
  query.set("populate[seo][fields][1]", "description");
  query.set("populate[seo][populate][image][fields][0]", "url");
  query.set("populate[seo][populate][image][fields][1]", "width");
  query.set("populate[seo][populate][image][fields][2]", "height");
  query.set("populate[seo][populate][image][fields][3]", "formats");
  query.set("populate[seo][populate][image][fields][4]", "updatedAt");
  query.set("populate[seo][populate][image][fields][5]", "alternativeText");
  appendCardsGridPopulateToQuery(query);

  return {
    path: `/api/wholesale-page?${query}`,
    tags: ["wholesale-page"],
  } as const;
}

const payloadSchema = z.object({
  data: z
    .object({
      title: z.string().trim().min(1),
      content: z.unknown().optional(),
      blocks: z.unknown().optional(),
      seo: z.unknown().optional(),
    })
    .nullable(),
});

export function mapWholesalePagePayload(
  payload: unknown,
  publicBase: string,
): WholesalePage | null {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) throw new CmsValidationError(parsed.error.message);
  if (!parsed.data.data) return null;

  return mapArticleDetailPayload(
    {
      data: [
        {
          documentId: "wholesale-page",
          name: parsed.data.data.title,
          slug: WHOLESALE_PATH.slice(1),
          content: parsed.data.data.content,
          blocks: parsed.data.data.blocks,
          seo: parsed.data.data.seo,
        },
      ],
    },
    publicBase,
  );
}
