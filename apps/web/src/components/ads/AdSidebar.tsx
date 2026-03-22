"use client";

import { YandexAd } from "./YandexAd";

const SIDEBAR_BLOCK_ID = process.env.NEXT_PUBLIC_YAN_SIDEBAR || "";

export function AdSidebar() {
  if (!SIDEBAR_BLOCK_ID) {
    return (
      <div className="sticky top-20 rounded-xl border border-dashed border-border bg-secondary/30 p-4">
        <div className="flex h-[400px] items-center justify-center text-xs text-muted-foreground">
          Рекламный блок (боковой)
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-20">
      <YandexAd blockId={SIDEBAR_BLOCK_ID} />
    </div>
  );
}
