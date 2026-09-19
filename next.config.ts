import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  async rewrites() {
    const wordpress = process.env.NEXT_PUBLIC_SHAMS_WP_URL?.replace(/\/$/, "");
    if (!wordpress) return [];
    return ["shams-orders", "shams-catalog-reconciliation"].map((namespace) => ({
      source: `/api/wordpress/${namespace}/v1/:path*`,
      destination: `${wordpress}/wp-json/${namespace}/v1/:path*`,
    }));
  },
  async headers() {
    return [{ source: "/api/wordpress/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] }];
  },
  // Next.js 16.3 does not emit the standalone NFT files while Vercel's build
  // adapter is active. Vercel does not consume the standalone bundle anyway.
  output: process.env.VERCEL ? undefined : "standalone",
  turbopack: { root: process.cwd() },
};

export default nextConfig;
