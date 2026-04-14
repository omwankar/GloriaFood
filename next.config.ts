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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Allow storefront to render inside external websites (iframe/widget).
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *;",
          },
          // Ensure old frame-blocking headers are not applied.
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
