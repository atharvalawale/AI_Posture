import type { NextConfig } from "next";

// Old static site pages, kept working for existing links.
const legacyPages = ["for-physios", "for-patients", "pricing", "about", "contact", "blog", "session"];

const nextConfig: NextConfig = {
  // Lets parallel workers build or run dev servers in one checkout without clashing.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // The repo lives on an exFAT drive where macOS writes AppleDouble "._*" files next to
    // everything, which corrupts Turbopack's persistent cache. Rebuild from scratch instead.
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      ...legacyPages.map((page) => ({ source: `/${page}.html`, destination: `/${page}`, permanent: true })),
    ];
  },
};

export default nextConfig;
