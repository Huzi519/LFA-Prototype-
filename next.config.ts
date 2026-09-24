import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We maintain our own CLAUDE.md by hand — don't let Next.js regenerate it.
  agentRules: false,
  experimental: {
    // Server Actions default to a 1MB body limit; file uploads (credentials,
    // conversation documents) go through Server Actions and CLAUDE.md allows
    // files up to 10MB, so raise the limit to match.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
