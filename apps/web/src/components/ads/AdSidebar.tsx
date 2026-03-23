"use client";

import { YandexAd } from "./YandexAd";

export function AdSidebar() {
  return (
    <div className="sticky top-20 space-y-4">
      <YandexAd blockId="R-A-18977791-1" />
      <YandexAd blockId="R-A-18977791-2" />
    </div>
  );
}
