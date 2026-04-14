import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "echpxdgrwzgyddmehnys.supabase.co",
      },
    ],
  },
};

export default nextConfig;
