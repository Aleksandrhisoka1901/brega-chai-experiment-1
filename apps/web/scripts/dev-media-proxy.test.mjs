import assert from "node:assert/strict";
import test from "node:test";

import {
  planDevMediaRequest,
  selectDevMediaResponseHeaders,
} from "./dev-media-proxy.mjs";

test("development media proxy is narrow and preserves image cache semantics", () => {
  const plan = planDevMediaRequest({
    headers: {
      authorization: "must-not-forward",
      "if-none-match": '"old"',
      range: "bytes=0-9",
    },
    method: "GET",
    requestUrl: "/storefront/tea.png?v=2026-08-16",
    upstreamOrigin: "http://rustfs:9000",
  });
  assert.deepEqual(plan, {
    headers: { "if-none-match": '"old"', range: "bytes=0-9" },
    method: "GET",
    target: new URL("http://rustfs:9000/storefront/tea.png?v=2026-08-16"),
  });
  assert.deepEqual(
    planDevMediaRequest({
      headers: {},
      method: "GET",
      requestUrl: "/storefront/../uploads/private.png",
      upstreamOrigin: "http://rustfs:9000",
    }),
    { headers: {}, status: 404 },
  );
  assert.deepEqual(
    planDevMediaRequest({
      headers: {},
      method: "POST",
      requestUrl: "/storefront/tea.png",
      upstreamOrigin: "http://rustfs:9000",
    }),
    { headers: { Allow: "GET, HEAD" }, status: 405 },
  );
  assert.deepEqual(
    selectDevMediaResponseHeaders({
      "cache-control": "public, max-age=3600",
      "content-type": "image/png",
      etag: '"image-v1"',
      "set-cookie": "must-not-forward",
    }),
    {
      "cache-control": "public, max-age=3600",
      "content-type": "image/png",
      etag: '"image-v1"',
    },
  );
});
