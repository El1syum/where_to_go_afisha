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
      <div className="flex gap-4 overflow-x-auto">
        {FOOTER_BLOCKS.map((id) => (
          <div key={id} className="aspect-square w-[160px] shrink-0">
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
