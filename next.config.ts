import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  optimizeFonts: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
  trailingSlash: true,
};

export default nextConfig;
