import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: false,
    domains: [],
  },
  serverExternalPackages: ['puppeteer', 'canvas'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('canvas');
    }
    return config;
  }
};

export default nextConfig;
