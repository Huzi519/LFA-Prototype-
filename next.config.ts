import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We maintain our own CLAUDE.md by hand — don't let Next.js regenerate it.
  agentRules: false,
};

export default nextConfig;
