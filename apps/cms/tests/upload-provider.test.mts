import assert from "node:assert/strict";
import test from "node:test";

import createPluginsConfig from "../config/plugins.ts";

function envFrom(values: Record<string, string>) {
  return (key: string, fallback?: string) => values[key] ?? fallback;
}

test("local upload leaves S3 disabled while keeping editor plugins", () => {
  const config = createPluginsConfig({
    env: envFrom({ UPLOAD_PROVIDER: "local" }),
  });

  assert.equal(config["better-blocks"].enabled, true);
  assert.deepEqual(config["order-admin"], {
    enabled: true,
    resolve: "./src/plugins/order-admin",
  });
  assert.equal(config.email.config.provider, "nodemailer");
  assert.equal(config.email.config.providerOptions.host, "localhost");
  assert.equal(config.email.config.providerOptions.port, 1025);
  assert.equal(config.upload, undefined);
});

test("RustFS uses the S3 provider with path style and a 12 MB limit", () => {
  const config = createPluginsConfig({
    env: envFrom({
      UPLOAD_PROVIDER: "aws-s3",
      MEDIA_PUBLIC_URL: "https://media.example.test/storefront",
      S3_ACCESS_KEY_ID: "seed-access",
      S3_ACCESS_SECRET: "seed-secret",
      S3_ENDPOINT: "http://rustfs:9000",
      S3_REGION: "us-east-1",
      S3_BUCKET: "storefront",
    }),
  });

  assert.equal(config["better-blocks"].enabled, true);
  assert.equal(config.upload.config.provider, "aws-s3");
  assert.equal(config.upload.config.sizeLimit, 12 * 1024 * 1024);
  assert.equal(
    config.upload.config.providerOptions.s3Options.endpoint,
    "http://rustfs:9000",
  );
  assert.equal(
    config.upload.config.providerOptions.s3Options.forcePathStyle,
    true,
  );
  assert.equal(
    config.upload.config.providerOptions.s3Options.params.Bucket,
    "storefront",
  );
  assert.equal(
    config.upload.config.providerOptions.baseUrl,
    "https://media.example.test/storefront",
  );
});
