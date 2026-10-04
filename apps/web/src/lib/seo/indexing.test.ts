import assert from "node:assert/strict";
import test from "node:test";

import {
  NOINDEX_ROBOTS_HEADER,
  PAGINATION_ROBOTS_HEADER,
  SITE_INDEXING_ENABLED,
  applyIndexingHeaders,
  isPaginationSearch,
  resolveRobotsContent,
} from "./indexing.ts";

test("opens the storefront to crawlers and still noindexes client errors and pagination", () => {
  assert.equal(SITE_INDEXING_ENABLED, true);
  assert.equal(
    resolveRobotsContent("User-agent: *\nAllow: /\n"),
    "User-agent: *\nAllow: /\n",
  );

  const headers = new Headers();
  applyIndexingHeaders(headers);
  assert.equal(headers.get("X-Robots-Tag"), null);

  const paginationHeaders = new Headers();
  applyIndexingHeaders(
    paginationHeaders,
    new URLSearchParams("page=2"),
  );
  assert.equal(
    paginationHeaders.get("X-Robots-Tag"),
    PAGINATION_ROBOTS_HEADER,
  );

  const notFoundHeaders = new Headers();
  applyIndexingHeaders(notFoundHeaders, undefined, 404);
  assert.equal(notFoundHeaders.get("X-Robots-Tag"), NOINDEX_ROBOTS_HEADER);

  const outageHeaders = new Headers();
  applyIndexingHeaders(outageHeaders, undefined, 503);
  assert.equal(outageHeaders.get("X-Robots-Tag"), null);

  assert.equal(isPaginationSearch(new URLSearchParams("page=1")), false);
  assert.equal(isPaginationSearch(new URLSearchParams("page=2")), true);
});
