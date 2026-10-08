import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "playwright", "@node-rs/argon2"],
};

export default nextConfig;
