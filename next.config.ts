import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api/proxy-remove-bg',
        destination: 'https://sdk.photoroom.com/v1/segment',
      },
    ];
  },
};

export default nextConfig;
