import { handleStockRequest } from "./handler.ts";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleStockRequest(request, {
    cmsUrl: process.env.CMS_INTERNAL_URL ?? "http://127.0.0.1:1337",
  });
}
