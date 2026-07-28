import { z } from "zod";

export const productTypeSchema = z.enum(["product", "ritual"]);

export const productSummarySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  type: productTypeSchema,
  title: z.string().min(1),
  packageLabel: z.string().min(1),
  priceRubles: z.number().int().positive(),
  imageUrl: z.url().optional(),
});

export type ProductType = z.infer<typeof productTypeSchema>;
export type ProductSummary = z.infer<typeof productSummarySchema>;
