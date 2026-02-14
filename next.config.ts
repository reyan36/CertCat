import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from Cloudinary and ImageKit
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.imagekit.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        pathname: '/**',
      },
    ],
  },
  // Empty turbopack config to silence the warning
  turbopack: {},
};

export default nextConfig;
