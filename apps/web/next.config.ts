import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.mds.yandex.net" },
      { protocol: "https", hostname: "**.kassir.ru" },
      { protocol: "https", hostname: "**.afisha.ru" },
      { protocol: "https", hostname: "kudaafisha.ru" },
      { protocol: "https", hostname: "api.live.mts.ru" },
      { protocol: "https", hostname: "media.ticketland.ru" },
    ],
  },
};

export default nextConfig;
