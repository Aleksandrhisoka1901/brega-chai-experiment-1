import { createHmac, randomUUID } from "node:crypto";

export type RevalidationEventName = "home" | "global" | "products" | "product";
export type RevalidationAction = "publish" | "update" | "unpublish";

export type RevalidationEvent =
  | {
      event: Exclude<RevalidationEventName, "product">;
      action: RevalidationAction;
    }
  | {
      event: "product";
      action: RevalidationAction;
      product: {
        documentId: string;
        type: "product" | "ritual";
        slug: string;
      };
    };

export type RevalidationPayload = RevalidationEvent & {
  id: string;
  occurredAt: string;
};

export type DeliveryResult =
  | { ok: true; eventId: string }
  | { ok: false; reason: "disabled" }
  | {
      ok: false;
      reason: "http-error";
      eventId: string;
      status: number;
    }
  | { ok: false; reason: "request-failed"; eventId: string };

export interface CacheRevalidationSender {
  send(event: RevalidationEvent): Promise<DeliveryResult>;
}

interface Logger {
  warn(...args: unknown[]): void;
}

export interface CacheRevalidationSenderOptions {
  url?: string;
  secret?: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
  logger?: Logger;
  now?: () => Date;
  randomUUID?: () => string;
}

const DEFAULT_TIMEOUT_MS = 3_000;

export function createCacheRevalidationSender({
  url,
  secret,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetch = globalThis.fetch,
  logger = console,
  now = () => new Date(),
  randomUUID: createEventId = randomUUID,
}: CacheRevalidationSenderOptions): CacheRevalidationSender {
  const enabled = Boolean(url?.trim() && secret);

  return {
    async send(event) {
      if (!enabled) {
        return { ok: false, reason: "disabled" };
      }

      const eventId = createEventId();
      const payload: RevalidationPayload = {
        id: eventId,
        ...event,
        occurredAt: now().toISOString(),
      };
      const body = JSON.stringify(payload);
      const signature = createHmac("sha256", secret!)
        .update(body)
        .digest("hex");
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(new Error("Revalidation request timed out")),
        Math.max(1, timeoutMs),
      );

      try {
        const response = await fetch(url!, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-revalidation-event-id": eventId,
            "x-revalidation-signature": `sha256=${signature}`,
          },
          body,
          signal: controller.signal,
        });

        if (!response.ok) {
          logger.warn("Cache revalidation delivery returned an error", {
            eventId,
            status: response.status,
          });
          return {
            ok: false,
            reason: "http-error",
            eventId,
            status: response.status,
          };
        }

        return { ok: true, eventId };
      } catch {
        logger.warn("Cache revalidation delivery failed", { eventId });
        return { ok: false, reason: "request-failed", eventId };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
