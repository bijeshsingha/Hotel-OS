import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.1.5",
    "192.168.1.5:3000",
    "192.168.1.*",
    "192.168.*",
  ],
};

export default nextConfig;
