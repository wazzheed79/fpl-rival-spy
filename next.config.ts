import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "resources.premierleague.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "fantasy.premierleague.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
