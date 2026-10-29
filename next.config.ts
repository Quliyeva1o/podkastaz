import type { NextConfig } from "next";

// Shared hosting (cPanel / CloudLinux) shows the host's 32 CPUs but limits the account to
// one: `NEXT_BUILD_CPUS=1 npm run build` keeps the build's workers inside that limit.
const buildCpus = Number(process.env.NEXT_BUILD_CPUS) || undefined;

const nextConfig: NextConfig = {
  experimental: buildCpus ? { cpus: buildCpus, staticGenerationMaxConcurrency: 2 } : {},
  output: "standalone",
  // A stray lockfile in the user's home folder must not be treated as the workspace root.
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // AVIF first (smallest), WebP fallback.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Test copies (SITE_NOINDEX=1, e.g. new.marketinq.az) must never be indexed.
          ...(process.env.SITE_NOINDEX === "1" ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
        ],
      },
    ];
  },
  turbopack: {
    // Same reason as outputFileTracingRoot: a stray ~/package-lock.json made Turbopack treat the
    // home folder as the project root and watch all of it. Every database write under ~ then
    // counted as a change, so `next dev` rebuilt and reloaded the page in an endless loop.
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
