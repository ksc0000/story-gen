import type { NextConfig } from "next";
import dns from "node:dns";

// next/font の Google Fonts 取得が IPv6 経路の不調時に全滅するのを防ぐ。
// （内蔵 undici は Happy Eyeballs 非対応で、DNS が IPv6 を先に返すと
//   IPv4 へフォールバックせず ETIMEDOUT になる）
dns.setDefaultResultOrder("ipv4first");

const nextConfig: NextConfig = {
  experimental: {
    webpackBuildWorker: false,
  },
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
