import { createFormToken } from "./domain.ts";
import { handleCreateOrder } from "./handler.ts";

export const dynamic = "force-dynamic";

// Nginx rate-limits this public path using its trusted client-IP configuration.
// The application deliberately has no process-local limiter; it only verifies
// the signed form age and honeypot before forwarding to the private Strapi API.

function configuration() {
  const secret = process.env.CHECKOUT_FORM_SECRET;
  const strapiToken = process.env.STRAPI_ORDER_TOKEN;
  const strapiUrl = process.env.CMS_INTERNAL_URL;
  return secret && strapiToken && strapiUrl
    ? { secret, strapiToken, strapiUrl }
    : undefined;
}

export function GET() {
  const secret = process.env.CHECKOUT_FORM_SECRET;
  if (!secret) {
    return Response.json(
      { error: { code: "UNAVAILABLE", message: "Форма временно недоступна." } },
      { status: 503 },
    );
  }
  return Response.json(
    { formToken: createFormToken({ secret }) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const dependencies = configuration();
  if (!dependencies) {
    return Response.json(
      { error: { code: "UNAVAILABLE", message: "Форма временно недоступна." } },
      { status: 503 },
    );
  }
  return handleCreateOrder(request, dependencies);
}
