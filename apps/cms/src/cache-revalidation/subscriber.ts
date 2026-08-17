import type {
  CacheRevalidationSender,
  RevalidationAction,
  RevalidationEvent,
  RevalidationEventName,
} from "./sender.js";

const EVENT_BY_UID: Readonly<Record<string, RevalidationEventName>> = {
  "api::home-page.home-page": "home",
  "api::global-setting.global-setting": "global",
  "api::products-page.products-page": "products",
  "api::rituals-page.rituals-page": "products",
  "api::product.product": "product",
};

interface StrapiPublicationEvent {
  uid?: string;
  media?: unknown;
  entry?: {
    documentId?: unknown;
    slug?: unknown;
    type?: unknown;
    publishedAt?: unknown;
  };
}

interface StrapiLike {
  log: {
    warn(...args: unknown[]): void;
  };
  eventHub: {
    subscribe(
      subscriber: (
        eventName: string,
        event: StrapiPublicationEvent,
      ) => Promise<void>,
    ): unknown;
  };
}

function routeEvent(
  action: RevalidationAction,
  value: StrapiPublicationEvent,
): RevalidationEvent | undefined {
  const event = value.uid ? EVENT_BY_UID[value.uid] : undefined;

  if (!event) {
    return undefined;
  }

  if (event !== "product") {
    return { event, action };
  }

  if (
    typeof value.entry?.documentId !== "string" ||
    typeof value.entry.slug !== "string" ||
    (value.entry.type !== "tovar" && value.entry.type !== "nabor")
  ) {
    return undefined;
  }

  return {
    event,
    action,
    product: {
      documentId: value.entry.documentId,
      slug: value.entry.slug,
      type: value.entry.type,
    },
  };
}

export function registerCacheRevalidationSubscriber(
  strapi: StrapiLike,
  sender: CacheRevalidationSender,
) {
  return strapi.eventHub.subscribe(async (eventName, event) => {
    if (eventName === "media.update") {
      await sender.send({ event: "media", action: "update" });
      return;
    }

    const action = eventName.startsWith("entry.")
      ? (eventName.slice("entry.".length) as RevalidationAction)
      : undefined;

    if (action !== "publish" && action !== "update" && action !== "unpublish") {
      return;
    }
    if (action === "update" && event.entry?.publishedAt == null) {
      return;
    }
    const routed = routeEvent(action, event);

    if (routed) {
      await sender.send(routed);
    }
  });
}
