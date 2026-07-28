import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@brega-chai/contracts"],
};

export default nextConfig;
