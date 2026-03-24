import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.mds.yandex.net",
      },
      {
        protocol: "https",
        hostname: "cdn.kassir.ru",
      },
      {
        protocol: "https",
        hostname: "*.kassir.ru",
      },
      {
        protocol: "https",
        hostname: "kudaafisha.ru",
      },
    ],
  },
};

export default nextConfig;
