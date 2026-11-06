import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Baileys is ESM with native parts, and must keep one live connection, so it
  // runs as a normal Node module instead of being bundled.
  serverExternalPackages: ["baileys"],
  experimental: {
    // Documents can be 5 MB, plus some overhead for the form encoding.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
