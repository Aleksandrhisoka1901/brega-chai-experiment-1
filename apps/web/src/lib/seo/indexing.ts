export const SITE_INDEXING_ENABLED = false;

export const NOINDEX_ROBOTS = { index: false, follow: false } as const;
export const NOINDEX_ROBOTS_HEADER = "noindex, nofollow";
export const CLOSED_ROBOTS_TXT = `User-agent: *
Disallow: /
`;

export function indexingMetadata() {
  return SITE_INDEXING_ENABLED ? {} : { robots: NOINDEX_ROBOTS };
}

export function applyIndexingHeaders(headers: Headers) {
  if (SITE_INDEXING_ENABLED) return;
  headers.set("X-Robots-Tag", NOINDEX_ROBOTS_HEADER);
}

export function resolveRobotsContent(cmsContent: string) {
  return SITE_INDEXING_ENABLED ? cmsContent : CLOSED_ROBOTS_TXT;
}
