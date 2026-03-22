"use client";

import { useEffect, useRef } from "react";

interface YandexAdProps {
  blockId: string;
  className?: string;
}

declare global {
  interface Window {
    yaContextCb: Array<() => void>;
    Ya: {
      Context: {
        AdvManager: {
          render: (params: { blockId: string; renderTo: string }) => void;
        };
      };
    };
  }
}

export function YandexAd({ blockId, className = "" }: YandexAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerId = `yandex-ad-${blockId}`;

  useEffect(() => {
    // Load Yandex ad script once
    if (!document.getElementById("yandex-context-script")) {
      const script = document.createElement("script");
      script.id = "yandex-context-script";
      script.src = "https://yandex.ru/ads/system/context.js";
      script.async = true;
      document.head.appendChild(script);
    }

    window.yaContextCb = window.yaContextCb || [];
    window.yaContextCb.push(() => {
      window.Ya.Context.AdvManager.render({
        blockId,
        renderTo: containerId,
      });
    });
  }, [blockId, containerId]);

  return (
    <div className={className}>
      <div id={containerId} ref={containerRef} />
    </div>
  );
}
