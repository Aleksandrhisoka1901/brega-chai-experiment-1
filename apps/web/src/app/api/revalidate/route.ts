import { revalidatePath, revalidateTag } from "next/cache";

import { createMemoryDeliveryStore, handleRevalidation } from "./handler.ts";

export const dynamic = "force-dynamic";

const deliveries = createMemoryDeliveryStore();

export async function POST(request: Request) {
  const secret = process.env.CACHE_REVALIDATION_SECRET;
  if (!secret) {
    return Response.json(
      {
        error: {
          code: "UNAVAILABLE",
          message: "Revalidation webhook is unavailable.",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return handleRevalidation(request, {
    secret,
    deliveries,
    revalidatePath,
    revalidateTag,
  });
}
