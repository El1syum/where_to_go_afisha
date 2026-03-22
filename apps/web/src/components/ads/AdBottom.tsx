"use client";

import { YandexAd } from "./YandexAd";

const BOTTOM_BLOCK_ID = process.env.NEXT_PUBLIC_YAN_BOTTOM || "";

export function AdBottom() {
  if (!BOTTOM_BLOCK_ID) {
    return (
      <div className="mx-auto mt-8 max-w-7xl px-4">
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-4">
          <div className="flex h-[120px] items-center justify-center text-xs text-muted-foreground">
            Рекламный блок (нижний)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-7xl px-4">
      <YandexAd blockId={BOTTOM_BLOCK_ID} />
    </div>
  );
}
