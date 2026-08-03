import { z } from "zod";

import { CmsValidationError } from "./errors.ts";

const responseSchema = z.object({
  data: z.array(
    z.object({
      slug: z.string().min(1),
      type: z.enum(["tovar", "nabor"]),
      publishedAt: z.iso.datetime().nullable(),
      updatedAt: z.iso.datetime(),
    }),
  ),
});

export type SitemapProduct = {
  slug: string;
  type: "tovar" | "nabor";
  updatedAt: string;
};

export function mapSitemapProductsPayload(payload: unknown): SitemapProduct[] {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) throw new CmsValidationError(parsed.error.message);

  return parsed.data.data
    .filter((product) => product.publishedAt)
    .map(({ slug, type, updatedAt }) => ({ slug, type, updatedAt }));
}
