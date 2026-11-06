import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Documents can be 5 MB, plus some overhead for the form encoding.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
