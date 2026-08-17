import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import nextConfig from "../../next.config.ts";

test("Next image optimization has exact media origins and a one-hour floor", () => {
  assert.equal(nextConfig.images?.minimumCacheTTL, 3600);
  assert.deepEqual(nextConfig.images?.formats, ["image/avif", "image/webp"]);
  assert.deepEqual(nextConfig.images?.remotePatterns, [
    {
      protocol: "https",
      hostname: "media.bregalliance.ru",
      port: "",
      pathname: "/storefront/**",
    },
    {
      protocol: "http",
      hostname: "localhost",
      port: "9000",
      pathname: "/storefront/**",
    },
    {
      protocol: "http",
      hostname: "localhost",
      port: "1337",
      pathname: "/uploads/**",
    },
  ]);
});

test("Docker development forwards public media without changing browser URLs", async () => {
  const [compose, dockerfile] = await Promise.all([
    readFile(
      new URL("../../../../docker-compose.yml", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../Dockerfile", import.meta.url), "utf8"),
  ]);

  assert.match(compose, /DEV_IMAGE_UPSTREAM:\s*http:\/\/rustfs:9000/);
  assert.match(dockerfile, /development[\s\S]*dev-with-media-proxy\.mjs/);
  assert.doesNotMatch(
    dockerfile.slice(dockerfile.indexOf("AS production")),
    /dev-with-media-proxy|DEV_IMAGE_UPSTREAM/,
  );
});

test("CMS images use Next optimization at the agreed quality", async () => {
  const source = await readFile(
    new URL("../components/responsive-image.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /from ["']next\/image["']/);
  assert.match(source, /quality=\{75\}/);
  assert.doesNotMatch(source, /<img\b/);
});

test("fetchCms retains the five-minute fallback data TTL", async () => {
  const source = await readFile(
    new URL("../server/cms/client.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /revalidate:\s*options\.revalidate\s*\?\?\s*300/);
});
