import assert from "node:assert/strict";
import test from "node:test";

import robots from "./robots.ts";

test("blocks all crawlers during pre-launch", () => {
  assert.deepEqual(robots(), {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  });
});
