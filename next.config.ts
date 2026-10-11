import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  reactStrictMode: true,
  // Invitation credentials are in /join URLs; omit development request-path logs.
  logging: { incomingRequests: false },
};

export default nextConfig;
