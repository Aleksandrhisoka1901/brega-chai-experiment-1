import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ROBOTS_CONTENT,
  mapRobotsPayload,
  normalizeRobotsContent,
} from "./robots-mapper.ts";

test("normalizes an editable robots.txt document", () => {
  assert.equal(
    mapRobotsPayload({
      data: {
        content:
          "\uFEFFUser-agent: *\r\nDisallow: /private\r\n\r\nSitemap: https://example.com/sitemap.xml",
      },
    }),
    "User-agent: *\nDisallow: /private\n\nSitemap: https://example.com/sitemap.xml\n",
  );
});

test("fails closed when the CMS document is absent or malformed", () => {
  for (const payload of [
    { data: null },
    {},
    { data: { content: "" } },
    { data: { content: "Sitemap: https://example.com/sitemap.xml" } },
    { data: { content: "User-agent: *\u0000\nAllow: /" } },
  ]) {
    assert.equal(mapRobotsPayload(payload), DEFAULT_ROBOTS_CONTENT);
  }
});

test("accepts an explicit allow policy when an editor supplies one", () => {
  assert.equal(
    normalizeRobotsContent("User-agent: *\nAllow: /"),
    "User-agent: *\nAllow: /\n",
  );
});
