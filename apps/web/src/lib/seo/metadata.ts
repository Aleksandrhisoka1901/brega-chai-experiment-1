import type { Metadata } from "next";

import { BRAND_NAME, BRAND_TAGLINE } from "../brand.ts";
import { indexingMetadata } from "./indexing.ts";

const DEFAULT_TITLE = BRAND_NAME;
const DEFAULT_DESCRIPTION = BRAND_TAGLINE;

export function siteOrigin(value = process.env["SITE_URL"]) {
  const url = new URL(value ?? "http://localhost:3000");
  return url.origin.toLowerCase();
}

export function canonicalUrl(path: string, origin = siteOrigin()) {
  const normalizedPath =
    path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "").toLowerCase()}`;
  return new URL(normalizedPath, origin).toString();
}

export function metadataWithFallbacks(input: {
  title?: string | null;
  description?: string | null;
}) {
  return {
    title: input.title?.trim() || DEFAULT_TITLE,
    description: input.description?.trim() || DEFAULT_DESCRIPTION,
  };
}

export function pageMetadata(input: {
  title?: string | null;
  description?: string | null;
  imageUrl?: string;
  path: string;
  includeCanonical?: boolean;
  robots?: Metadata["robots"];
}): Metadata {
  const values = metadataWithFallbacks(input);
  const canonical = canonicalUrl(input.path);
  const includeCanonical = input.includeCanonical !== false;

  return {
    ...values,
    ...indexingMetadata(),
    ...(input.robots ? { robots: input.robots } : {}),
    alternates: includeCanonical
      ? { canonical }
      : { canonical: null },
    openGraph: {
      ...values,
      ...(input.imageUrl ? { images: [{ url: input.imageUrl }] } : {}),
      type: "website",
      ...(includeCanonical ? { url: canonical } : {}),
      siteName: DEFAULT_TITLE,
    },
  };
}
