"use client";

import { YandexAd } from "./YandexAd";

const FOOTER_BLOCKS = [
  "R-A-18977791-3",
];

export function AdBottom() {
  return (
    <div className="mx-auto mt-8 max-w-7xl px-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FOOTER_BLOCKS.map((id) => (
          <div key={id} className="aspect-square">
            <YandexAd blockId={id} />
          </div>
        ))}
      </div>
      <div className="mt-4">
        <YandexAd blockId="R-A-18977791-10" />
      </div>
    </div>
  );
}
