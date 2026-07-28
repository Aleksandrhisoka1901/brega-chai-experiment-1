import type { Metadata } from "next";

const DEFAULT_TITLE = "Brega Chai";
const DEFAULT_DESCRIPTION = "Чай и ритуалы Brega Chai";

export function siteOrigin(value = process.env.SITE_URL) {
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
  path: string;
}): Metadata {
  const values = metadataWithFallbacks(input);
  const canonical = canonicalUrl(input.path);

  return {
    ...values,
    alternates: { canonical },
    openGraph: {
      ...values,
      type: "website",
      url: canonical,
      siteName: DEFAULT_TITLE,
    },
  };
}
