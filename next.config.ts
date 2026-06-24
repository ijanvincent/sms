import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle for a small, production-grade Docker image.
  output: "standalone",
};

export default nextConfig;
