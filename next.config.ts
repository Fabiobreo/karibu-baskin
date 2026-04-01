import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.15.109", "localhost", "127.0.0.1"],
  images: {
    remotePatterns: [
      {
        // Foto profilo Google OAuth
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
