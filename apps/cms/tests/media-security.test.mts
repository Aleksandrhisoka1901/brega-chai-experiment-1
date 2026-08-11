import assert from "node:assert/strict";
import test from "node:test";

import createMiddlewaresConfig from "../config/middlewares.ts";

function envFrom(values: Record<string, string>) {
  return (key: string, fallback?: string) => values[key] ?? fallback;
}

test("admin CSP permits images from the configured media origin", () => {
  const config = createMiddlewaresConfig({
    env: envFrom({
      MEDIA_PUBLIC_URL: "http://localhost:9000/storefront",
    }),
  });
  const security = config.find(
    (middleware) =>
      typeof middleware === "object" &&
      middleware !== null &&
      middleware.name === "strapi::security",
  );

  assert.ok(security && typeof security === "object");
  assert.deepEqual(
    security.config.contentSecurityPolicy.directives["img-src"],
    [
      "'self'",
      "data:",
      "blob:",
      "market-assets.strapi.io",
      "http://localhost:9000",
    ],
  );
  assert.deepEqual(
    security.config.contentSecurityPolicy.directives["media-src"],
    ["'self'", "data:", "blob:", "http://localhost:9000"],
  );
});
