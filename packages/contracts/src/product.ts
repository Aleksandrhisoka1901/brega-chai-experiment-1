import { z } from "zod";

export const productTypeSchema = z.enum(["tovar", "nabor"]);

export const productSummarySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  type: productTypeSchema,
  title: z.string().min(1),
  packageLabel: z.string().min(1),
  priceRubles: z.number().int().positive(),
  excerpt: z.string().min(1),
  inStock: z.boolean(),
  imageUrl: z.url().optional(),
  imageAlt: z.string().min(1).optional(),
  imageSources: z
    .array(
      z.object({
        url: z.url(),
        width: z.number().int().positive(),
      }),
    )
    .optional(),
});

export type ProductType = z.infer<typeof productTypeSchema>;
export type ProductSummary = z.infer<typeof productSummarySchema>;
