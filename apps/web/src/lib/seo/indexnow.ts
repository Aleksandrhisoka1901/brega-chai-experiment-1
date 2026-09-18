import {
  CAPABILITY_PATH,
  CONFORMITY_PATH,
  WHOLESALE_PATH,
} from "../storefront-routes.ts";
import { canonicalUrl, siteOrigin } from "./metadata.ts";

export const INDEXNOW_KEY = "lonenergyindexnow7f3c9a2e1b84d056";
export const INDEXNOW_ENDPOINT = "https://yandex.com/indexnow";

type IndexNowEvent = {
  event: string;
  product?: { type: "tovar" | "nabor"; slug: string };
  article?: { slug: string };
};

export function indexNowKeyLocation(origin = siteOrigin()) {
  return `${origin}/${INDEXNOW_KEY}.txt`;
}

export function urlsForIndexNowEvent(
  event: IndexNowEvent,
  origin = siteOrigin(),
): string[] {
  if (event.event === "wholesale") {
    return [canonicalUrl(WHOLESALE_PATH, origin)];
  }
  if (event.event === "home" || event.event === "global") {
    return [canonicalUrl("/", origin)];
  }
  if (event.event === "products") {
    return [canonicalUrl("/stantsii", origin), canonicalUrl("/paneli", origin)];
  }
  if (event.event === "product") {
    if (!event.product) return [];
    const section = event.product.type === "nabor" ? "paneli" : "stantsii";
    return [
      canonicalUrl(`/${section}/${event.product.slug}`, origin),
      canonicalUrl(`/${section}`, origin),
      canonicalUrl("/", origin),
    ];
  }
  if (event.event === "articles") {
    return [canonicalUrl("/stati", origin)];
  }
  if (event.event === "article") {
    if (!event.article) return [];
    return [
      canonicalUrl(`/stati/${event.article.slug}`, origin),
      canonicalUrl("/stati", origin),
    ];
  }
  if (event.event === "capability") {
    return [canonicalUrl(CAPABILITY_PATH, origin)];
  }
  if (event.event === "conformity") {
    return [canonicalUrl(CONFORMITY_PATH, origin)];
  }
  return [
    canonicalUrl("/", origin),
    canonicalUrl("/stantsii", origin),
    canonicalUrl("/paneli", origin),
    canonicalUrl("/stati", origin),
    canonicalUrl(CAPABILITY_PATH, origin),
  ];
}

export async function submitIndexNow(
  urls: string[],
  options?: {
    origin?: string;
    fetchImpl?: typeof fetch;
  },
) {
  const unique = [...new Set(urls)].slice(0, 10_000);
  if (unique.length === 0) return;
  const origin = options?.origin ?? siteOrigin();
  const fetchImpl = options?.fetchImpl ?? fetch;
  try {
    await fetchImpl(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(origin).host,
        key: INDEXNOW_KEY,
        keyLocation: indexNowKeyLocation(origin),
        urlList: unique,
      }),
    });
  } catch {
    // IndexNow is best-effort; publishing must not fail because Yandex is unreachable.
  }
}
