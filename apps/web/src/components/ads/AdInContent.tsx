"use client";

import { YandexAd } from "./YandexAd";

const IN_CONTENT_BLOCK_ID = process.env.NEXT_PUBLIC_YAN_CONTENT || "";

export function AdInContent() {
  if (!IN_CONTENT_BLOCK_ID) {
    return (
      <div className="my-6 rounded-xl border border-dashed border-border bg-secondary/30 p-4">
        <div className="flex h-[100px] items-center justify-center text-xs text-muted-foreground">
          Рекламный блок (в контенте)
        </div>
      </div>
    );
  }

  return (
    <div className="my-6">
      <YandexAd blockId={IN_CONTENT_BLOCK_ID} />
    </div>
  );
}
