import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_HEADER = "x-revalidation-signature";
const SIGNATURE_PREFIX = "sha256=";
const MAX_DELIVERIES = 1_000;
const MAX_BODY_BYTES = 16_384;

type PathType = "page" | "layout";
type ProductType = "tovar" | "nabor";

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
      event: "home" | "global" | "products" | "media" | "articles";
      action: "publish" | "update" | "unpublish";
      occurredAt: string;
    }
  | {
      id: string;
      event: "product";
      action: "publish" | "update" | "unpublish";
      occurredAt: string;
      product: { documentId: string; type: ProductType; slug: string };
    }
  | {
      id: string;
      event: "article";
      action: "publish" | "update" | "unpublish";
      occurredAt: string;
      article: { documentId: string; slug: string };
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
    body.event === "products" ||
    body.event === "media" ||
    body.event === "articles"
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
  if (body.event === "article") {
    if (
      !hasExactKeys(body, ["action", "event", "id", "occurredAt", "article"]) ||
      !body.article ||
      typeof body.article !== "object" ||
      Array.isArray(body.article)
    ) {
      return;
    }

    const article = body.article as Record<string, unknown>;
    if (
      !hasExactKeys(article, ["documentId", "slug"]) ||
      !isNonEmptyString(article.documentId) ||
      !isNonEmptyString(article.slug)
    ) {
      return;
    }
    return {
      id: body.id,
      event: "article",
      action: body.action,
      occurredAt: body.occurredAt,
      article: {
        documentId: article.documentId,
        slug: article.slug,
      },
    };
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
    (product.type !== "tovar" && product.type !== "nabor")
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
  if (event.event === "media") {
    revalidateTag("home");
    revalidateTag("global");
    revalidateTag("products");
    revalidatePath("/", "layout");
    revalidatePath("/", "page");
    revalidatePath("/stantsii", "page");
    revalidatePath("/paneli", "page");
    revalidatePath("/stantsii/[slug]", "page");
    revalidatePath("/paneli/[slug]", "page");
    revalidateTag("articles");
    revalidateTag("articles-page");
    revalidatePath("/stati", "page");
    revalidatePath("/stati/[slug]", "page");
    return;
  }

  if (event.event === "articles") {
    revalidateTag("articles-page");
    revalidateTag("articles");
    revalidatePath("/stati", "page");
    return;
  }

  if (event.event === "article") {
    revalidateTag("articles");
    revalidateTag(`article-slug:${event.article.slug}`);
    revalidatePath("/stati", "page");
    revalidatePath(`/stati/${event.article.slug}`, "page");
    return;
  }

  revalidateTag("products");
  revalidatePath("/stantsii", "page");
  revalidatePath("/paneli", "page");
  if (event.event === "product") {
    revalidateTag(`product-slug:${event.product.type}:${event.product.slug}`);
    revalidatePath(
      `/${event.product.type === "nabor" ? "paneli" : "stantsii"}/${event.product.slug}`,
      "page",
    );
    revalidatePath("/", "page");
  }
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
