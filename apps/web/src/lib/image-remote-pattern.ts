import type { NextConfig } from "next";

type RemotePattern = Exclude<
  NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number],
  URL
>;

export function createMediaRemotePattern(mediaUrl: string): RemotePattern {
  const url = new URL(mediaUrl);
  const mediaPath = url.pathname.replace(/\/+$/, "");

  return {
    protocol: url.protocol.slice(0, -1) as "http" | "https",
    hostname: url.hostname,
    port: url.port,
    pathname: mediaPath ? `${mediaPath}/**` : "/**",
  };
}
