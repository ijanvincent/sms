import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle for a small, production-grade Docker image.
  output: "standalone",
  // Hide the on-screen dev indicator badge; compile/runtime errors still surface.
  devIndicators: false,
};

export default nextConfig;
