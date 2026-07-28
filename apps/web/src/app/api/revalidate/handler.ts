import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_HEADER = "x-revalidation-signature";
const SIGNATURE_PREFIX = "sha256=";
const MAX_DELIVERIES = 1_000;
const MAX_BODY_BYTES = 16_384;

type PathType = "page" | "layout";
type ProductType = "product" | "ritual";

interface DeliveryStore {
  claim(eventId: string, digest: string): "claimed" | "duplicate" | "conflict";
  release(eventId: string): void;
}

export interface RevalidationDependencies {
  secret: string;
  deliveries: DeliveryStore;
  revalidateTag(tag: string): void;
  revalidatePath(path: string, type?: PathType): void;
}

type RevalidationEvent =
  | {
      id: string;
      event: "home" | "global" | "products";
      action: "publish" | "update" | "unpublish";
      occurredAt: string;
    }
  | {
      id: string;
      event: "product";
      action: "publish" | "update" | "unpublish";
      occurredAt: string;
      product: { documentId: string; type: ProductType; slug: string };
    };

export function createMemoryDeliveryStore(
  capacity = MAX_DELIVERIES,
): DeliveryStore {
  const claimed = new Map<string, string>();
  return {
    claim(eventId, digest) {
      const existing = claimed.get(eventId);
      if (existing) return existing === digest ? "duplicate" : "conflict";
      claimed.set(eventId, digest);
      if (claimed.size > capacity) {
        const oldest = claimed.keys().next().value;
        if (oldest !== undefined) claimed.delete(oldest);
      }
      return "claimed";
    },
    release(eventId) {
      claimed.delete(eventId);
    },
  };
}

function safeError(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 200;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort();
  return (
    actual.length === keys.length &&
    [...keys].sort().every((key, index) => key === actual[index])
  );
}

function parseEvent(value: unknown): RevalidationEvent | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const body = value as Record<string, unknown>;
  if (
    !isNonEmptyString(body.id) ||
    !isNonEmptyString(body.event) ||
    (body.action !== "publish" &&
      body.action !== "update" &&
      body.action !== "unpublish") ||
    !isNonEmptyString(body.occurredAt) ||
    Number.isNaN(Date.parse(body.occurredAt))
  ) {
    return;
  }

  if (
    body.event === "home" ||
    body.event === "global" ||
    body.event === "products"
  ) {
    return hasExactKeys(body, ["action", "event", "id", "occurredAt"])
      ? {
          id: body.id,
          event: body.event,
          action: body.action,
          occurredAt: body.occurredAt,
        }
      : undefined;
  }
  if (
    body.event !== "product" ||
    !hasExactKeys(body, ["action", "event", "id", "occurredAt", "product"]) ||
    !body.product ||
    typeof body.product !== "object" ||
    Array.isArray(body.product)
  ) {
    return;
  }

  const product = body.product as Record<string, unknown>;
  if (
    !hasExactKeys(product, ["documentId", "slug", "type"]) ||
    !isNonEmptyString(product.documentId) ||
    !isNonEmptyString(product.slug) ||
    (product.type !== "product" && product.type !== "ritual")
  ) {
    return;
  }
  return {
    id: body.id,
    event: "product",
    action: body.action,
    occurredAt: body.occurredAt,
    product: {
      documentId: product.documentId,
      slug: product.slug,
      type: product.type,
    },
  };
}

function validSignature(
  rawBody: string,
  header: string | null,
  secret: string,
) {
  if (!header?.startsWith(SIGNATURE_PREFIX)) return false;
  const suppliedHex = header.slice(SIGNATURE_PREFIX.length);
  if (!/^[\da-f]{64}$/i.test(suppliedHex)) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const supplied = Buffer.from(suppliedHex, "hex");
  return timingSafeEqual(expected, supplied);
}

function invalidate(
  event: RevalidationEvent,
  dependencies: RevalidationDependencies,
) {
  const { revalidatePath, revalidateTag } = dependencies;
  if (event.event === "home") {
    revalidateTag("home");
    revalidatePath("/", "page");
    return;
  }
  if (event.event === "global") {
    revalidateTag("global");
    revalidatePath("/", "layout");
    return;
  }

  revalidateTag("products");
  revalidatePath("/products", "page");
  if (event.event === "product") {
    revalidateTag(`product-slug:${event.product.type}:${event.product.slug}`);
    revalidatePath(`/products/${event.product.slug}`, "page");
    revalidatePath("/", "page");
  }
  revalidatePath("/sitemap.xml", "page");
}

export async function handleRevalidation(
  request: Request,
  dependencies: RevalidationDependencies,
) {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
    return safeError(413, "PAYLOAD_TOO_LARGE", "Webhook payload is too large.");
  }
  if (
    !validSignature(
      rawBody,
      request.headers.get(SIGNATURE_HEADER),
      dependencies.secret,
    )
  ) {
    return safeError(401, "INVALID_SIGNATURE", "Unauthorized webhook.");
  }

  let value: unknown;
  try {
    value = JSON.parse(rawBody);
  } catch {
    return safeError(400, "INVALID_EVENT", "Unsupported webhook event.");
  }
  const event = parseEvent(value);
  if (!event) {
    return safeError(400, "INVALID_EVENT", "Unsupported webhook event.");
  }
  const digest = createHmac("sha256", dependencies.secret)
    .update(rawBody)
    .digest("hex");
  const claim = dependencies.deliveries.claim(event.id, digest);
  if (claim === "conflict") {
    return safeError(
      409,
      "EVENT_CONFLICT",
      "Webhook event ID is already used.",
    );
  }
  if (claim === "duplicate") {
    return Response.json(
      { ok: true, eventId: event.id, duplicate: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    invalidate(event, dependencies);
  } catch {
    dependencies.deliveries.release(event.id);
    return safeError(503, "REVALIDATION_FAILED", "Cache revalidation failed.");
  }
  return Response.json(
    { ok: true, eventId: event.id, duplicate: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}
