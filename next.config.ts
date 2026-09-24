import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // Next.js 16.3 does not emit the standalone NFT files while Vercel's build
  // adapter is active. Vercel does not consume the standalone bundle anyway.
  output: process.env.VERCEL ? undefined : "standalone",
  turbopack: { root: process.cwd() },
};

export default nextConfig;
