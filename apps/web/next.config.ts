import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.mds.yandex.net",
        pathname: "/get-afishanew/**",
      },
    ],
  },
};

export default nextConfig;
