import type { NextConfig } from "next";

import { createMediaRemotePattern } from "./src/lib/image-remote-pattern.ts";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "media.bregalliance.ru",
    port: "",
    pathname: "/**",
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
    port: "9001",
    pathname: "/storefront/**",
  },
  {
    protocol: "http",
    hostname: "localhost",
    port: "1337",
    pathname: "/uploads/**",
  },
  {
    protocol: "http",
    hostname: "localhost",
    port: "1338",
    pathname: "/uploads/**",
  },
];

const configuredMediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL;
if (configuredMediaUrl) {
  const pattern = createMediaRemotePattern(configuredMediaUrl);
  const duplicate = remotePatterns.some(
    (candidate) =>
      !(candidate instanceof URL) &&
      candidate.protocol === pattern.protocol &&
      candidate.hostname === pattern.hostname &&
      (candidate.port ?? "") === pattern.port &&
      candidate.pathname === pattern.pathname,
  );
  if (!duplicate) remotePatterns.push(pattern);
}

const nextConfig: NextConfig = {
  output: "standalone",
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
    remotePatterns,
  },
};

export default nextConfig;
