import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. Next's App Router injects small inline bootstrap
// scripts, so 'unsafe-inline' is required for script-src; Tailwind injects inline
// styles, so it's required for style-src too. 'unsafe-eval' is only needed by the
// dev server's HMR runtime, so it is scoped to development. frame-ancestors 'none'
// (paired with X-Frame-Options) blocks clickjacking.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle for a small, production-grade Docker image.
  output: "standalone",
  // Hide the on-screen dev indicator badge; compile/runtime errors still surface.
  devIndicators: false,
  // Defense-in-depth headers applied to every response.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
