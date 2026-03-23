"use client";

import { YandexAd } from "./YandexAd";

const FOOTER_BLOCKS = [
  "R-A-18977791-3",
  "R-A-18977791-4",
  "R-A-18977791-5",
  "R-A-18977791-6",
  "R-A-18977791-7",
  "R-A-18977791-8",
];

export function AdBottom() {
  return (
    <div className="mx-auto mt-8 max-w-7xl px-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {FOOTER_BLOCKS.map((id) => (
          <YandexAd key={id} blockId={id} />
        ))}
      </div>
    </div>
  );
}
