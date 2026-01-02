import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features for better caching
  experimental: {
    // Uncomment when ready for cache components
    // cacheComponents: true,
  },
};

export default nextConfig;
