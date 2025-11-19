import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "images.justwatch.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "widget.justwatch.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
