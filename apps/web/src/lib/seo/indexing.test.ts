import assert from "node:assert/strict";
import test from "node:test";

import {
  CLOSED_ROBOTS_TXT,
  NOINDEX_ROBOTS_HEADER,
  SITE_INDEXING_ENABLED,
  applyIndexingHeaders,
  resolveRobotsContent,
} from "./indexing.ts";

test("keeps the storefront closed to crawlers until indexing is re-enabled", () => {
  assert.equal(SITE_INDEXING_ENABLED, false);
  assert.equal(
    resolveRobotsContent("User-agent: *\nAllow: /\n"),
    CLOSED_ROBOTS_TXT,
  );

  const headers = new Headers();
  applyIndexingHeaders(headers);
  assert.equal(headers.get("X-Robots-Tag"), NOINDEX_ROBOTS_HEADER);
});
