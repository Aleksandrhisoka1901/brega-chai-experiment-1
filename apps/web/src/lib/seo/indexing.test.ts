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

test("opens the storefront to crawlers and still noindexes errors and pagination", () => {
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

  const errorHeaders = new Headers();
  applyIndexingHeaders(errorHeaders, undefined, 503);
  assert.equal(errorHeaders.get("X-Robots-Tag"), NOINDEX_ROBOTS_HEADER);

  assert.equal(isPaginationSearch(new URLSearchParams("page=1")), false);
  assert.equal(isPaginationSearch(new URLSearchParams("page=2")), true);
});
