import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.microsoft.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.microsoftonline.com",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/api/freelancer/:path*",
        destination: `${backendUrl}/api/freelancer/:path*`,
      },
      {
        source: "/api/client/:path*",
        destination: `${backendUrl}/api/client/:path*`,
      },
      {
        source: "/backend-health",
        destination: `${backendUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
