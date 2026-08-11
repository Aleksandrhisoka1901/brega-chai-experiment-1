import { stockSchema } from "@brega-chai/contracts";
import { z } from "zod";

import type { CartItem } from "./types";

const stockResponseSchema = z
  .object({
    stocks: z.array(
      z
        .object({
          productId: z.string().min(1),
          stock: stockSchema,
        })
        .strict(),
    ),
  })
  .strict();

export async function fetchCartStock(
  items: ReadonlyArray<Pick<CartItem, "productId">>,
  fetcher: typeof globalThis.fetch = globalThis.fetch,
) {
  const productIds = [...new Set(items.map((item) => item.productId))];
  if (productIds.length === 0) return {};

  const response = await fetcher("/api/checkout/stock", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ productIds }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Stock request failed");
  }

  const parsed = stockResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Invalid stock response");
  }

  return Object.fromEntries(
    parsed.data.stocks.map(({ productId, stock }) => [productId, stock]),
  );
}
