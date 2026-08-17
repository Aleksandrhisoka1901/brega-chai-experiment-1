import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
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
];

const configuredMediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL;
if (configuredMediaUrl) {
  const url = new URL(configuredMediaUrl);
  const mediaPath = url.pathname.replace(/\/$/, "") || "/storefront";
  const pathname = `${mediaPath}/**`;
  const pattern = {
    protocol: url.protocol.slice(0, -1) as "http" | "https",
    hostname: url.hostname,
    port: url.port,
    pathname,
  };
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
