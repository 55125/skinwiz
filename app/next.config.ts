import type { NextConfig } from "next";

// Baseline security headers on every response. No Content-Security-Policy
// yet: the app relies on Next's inline bootstrap scripts and JSON-LD, so a
// CSP needs nonces and a report-only trial first.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Catalog photos in public/ (names aren't content-hashed, so not
      // immutable). Saves every product view a revalidation round trip to
      // the single Node process.
      {
        source: "/product-images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
