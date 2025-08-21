import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    domains: [],
  },
  serverExternalPackages: ['puppeteer', 'canvas'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('canvas');
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['puppeteer', 'canvas']
  }
};

export default nextConfig;
