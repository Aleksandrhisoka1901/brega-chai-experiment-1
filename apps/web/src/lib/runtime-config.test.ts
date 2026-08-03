import assert from "node:assert/strict";
import test from "node:test";

import {
  collectPublicRuntimeConfig,
  createRuntimeConfigScript,
  readPublicRuntimeConfig,
} from "./runtime-config.ts";

test("exposes only the explicit public runtime allowlist", () => {
  assert.deepEqual(
    collectPublicRuntimeConfig({
      SITE_URL: "https://brega.example",
      NEXT_PUBLIC_CMS_URL: "https://admin.brega.example",
      NEXT_PUBLIC_MEDIA_URL: "https://media.brega.example/storefront",
      CMS_INTERNAL_URL: "http://cms:1337",
      CHECKOUT_FORM_SECRET: "checkout-secret",
      STRAPI_ORDER_TOKEN: "order-token",
      CACHE_REVALIDATION_SECRET: "revalidation-secret",
      DATABASE_PASSWORD: "database-password",
      S3_ACCESS_SECRET: "storage-secret",
    }),
    {
      SITE_URL: "https://brega.example",
      NEXT_PUBLIC_CMS_URL: "https://admin.brega.example",
      NEXT_PUBLIC_MEDIA_URL: "https://media.brega.example/storefront",
    },
  );
});

test("escapes script-breaking characters in runtime values", () => {
  const script = createRuntimeConfigScript({
    SITE_URL: "https://brega.example/?value=</script>",
  });

  assert.doesNotMatch(script, /<\/script>/);
  assert.match(script, /\\u003c\/script>/);
});

test("browser runtime values override safe fallbacks", () => {
  assert.equal(
    readPublicRuntimeConfig("NEXT_PUBLIC_MEDIA_URL", "https://build.example", {
      NEXT_PUBLIC_MEDIA_URL: "https://runtime.example",
    }),
    "https://runtime.example",
  );
  assert.equal(
    readPublicRuntimeConfig(
      "NEXT_PUBLIC_MEDIA_URL",
      "https://build.example",
      {},
    ),
    "https://build.example",
  );
});

test("rejects malformed public URLs instead of publishing them", () => {
  assert.throws(
    () =>
      collectPublicRuntimeConfig({
        NEXT_PUBLIC_MEDIA_URL: "javascript:alert(1)",
      }),
    /NEXT_PUBLIC_MEDIA_URL/,
  );
});
