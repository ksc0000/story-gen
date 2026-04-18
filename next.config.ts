import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export disabled temporarily due to Next.js 15 issue with dynamic routes
  // Will use standard build with Firebase Hosting rewrites
  // output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  distDir: "out",  // Use same output directory name for consistency
};

export default nextConfig;
