import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  allowedDevOrigins: [
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
    "192.168.0.19",
    "192.168.0.19:3000",
    "192.168.0.*",
    "192.168.1.*",
    "192.168.*",
    "172.*",
    "10.*",
  ],
};

export default nextConfig;
