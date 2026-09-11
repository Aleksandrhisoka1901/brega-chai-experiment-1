export const SITE_INDEXING_ENABLED = true;

export const NOINDEX_ROBOTS = { index: false, follow: false } as const;
export const PAGINATION_ROBOTS = { index: false, follow: true } as const;
export const NOINDEX_ROBOTS_HEADER = "noindex, nofollow";
export const PAGINATION_ROBOTS_HEADER = "noindex, follow";
export const CLOSED_ROBOTS_TXT = `User-agent: *
Disallow: /
`;

export function indexingMetadata() {
  return SITE_INDEXING_ENABLED ? {} : { robots: NOINDEX_ROBOTS };
}

export function isPaginationSearch(searchParams: URLSearchParams) {
  const page = searchParams.get("page");
  return page != null && /^[1-9]\d*$/.test(page) && Number(page) > 1;
}

export function applyIndexingHeaders(
  headers: Headers,
  searchParams?: URLSearchParams,
  status = 200,
) {
  if (!SITE_INDEXING_ENABLED) {
    headers.set(
      "X-Robots-Tag",
      searchParams && isPaginationSearch(searchParams)
        ? PAGINATION_ROBOTS_HEADER
        : NOINDEX_ROBOTS_HEADER,
    );
    return;
  }

  if (status >= 400) {
    headers.set("X-Robots-Tag", NOINDEX_ROBOTS_HEADER);
    return;
  }

  if (searchParams && isPaginationSearch(searchParams)) {
    headers.set("X-Robots-Tag", PAGINATION_ROBOTS_HEADER);
  }
}

export function resolveRobotsContent(cmsContent: string) {
  return SITE_INDEXING_ENABLED ? cmsContent : CLOSED_ROBOTS_TXT;
}
