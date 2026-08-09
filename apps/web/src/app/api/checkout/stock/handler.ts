import { stockSchema } from "@brega-chai/contracts";
import { z } from "zod";

const CMS_TIMEOUT_MS = 5_000;
const MAX_CART_ITEMS = 50;

const stockRequestSchema = z
  .object({
    productIds: z
      .array(z.string().trim().min(1).max(100))
      .min(1)
      .max(MAX_CART_ITEMS),
  })
  .strict()
  .superRefine(({ productIds }, context) => {
    if (new Set(productIds).size !== productIds.length) {
      context.addIssue({
        code: "custom",
        message: "Product IDs must be unique",
        path: ["productIds"],
      });
    }
  });

const cmsStockResponseSchema = z.object({
  data: z.array(
    z.object({
      documentId: z.string().min(1),
      stock: stockSchema,
    }),
  ),
});

type FetchBoundary = (request: Request) => Promise<Response>;

export interface StockHandlerDependencies {
  cmsUrl: string;
  fetch?: FetchBoundary;
  timeoutMs?: number;
}

function safeError(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    { headers: { "Cache-Control": "no-store" }, status },
  );
}

export async function handleStockRequest(
  request: Request,
  dependencies: StockHandlerDependencies,
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return safeError(400, "INVALID_REQUEST", "Не удалось проверить корзину.");
  }

  const parsed = stockRequestSchema.safeParse(body);
  if (!parsed.success) {
    return safeError(400, "INVALID_REQUEST", "Не удалось проверить корзину.");
  }

  const query = new URLSearchParams({
    status: "published",
    "fields[0]": "stock",
    "pagination[pageSize]": String(parsed.data.productIds.length),
  });
  parsed.data.productIds.forEach((productId, index) => {
    query.set(`filters[documentId][$in][${index}]`, productId);
  });

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    dependencies.timeoutMs ?? CMS_TIMEOUT_MS,
  );

  try {
    const response = await (dependencies.fetch ?? fetch)(
      new Request(new URL(`/api/products?${query}`, dependencies.cmsUrl), {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }),
    );
    if (!response.ok) {
      return safeError(
        503,
        "STOCK_UNAVAILABLE",
        "Не удалось проверить наличие товаров. Попробуйте ещё раз.",
      );
    }

    const payload = cmsStockResponseSchema.safeParse(await response.json());
    if (!payload.success) {
      return safeError(
        503,
        "STOCK_UNAVAILABLE",
        "Не удалось проверить наличие товаров. Попробуйте ещё раз.",
      );
    }

    const stockByProductId = new Map(
      payload.data.data.map((product) => [product.documentId, product.stock]),
    );
    return Response.json(
      {
        stocks: parsed.data.productIds.map((productId) => ({
          productId,
          stock: stockByProductId.get(productId) ?? 0,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return safeError(
      503,
      "STOCK_UNAVAILABLE",
      "Не удалось проверить наличие товаров. Попробуйте ещё раз.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
