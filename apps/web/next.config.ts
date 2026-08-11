import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/storefront/**",
      },
    ],
  },
};

export default nextConfig;
