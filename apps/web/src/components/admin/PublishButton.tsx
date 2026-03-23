"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Channel {
  id: number;
  name: string;
  platform: string;
  channelId: string;
  isActive: boolean;
}

interface PublishButtonProps {
  eventId: number;
  channels: Channel[];
  publishedChannelIds: number[];
}

const PLATFORM_EMOJI: Record<string, string> = {
  TELEGRAM: "📨",
  VK: "💬",
  MAX: "💎",
};

export function PublishButton({ eventId, channels, publishedChannelIds }: PublishButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [publishing, setPublishing] = useState<number | null>(null);

  async function publish(channelId: number) {
    setPublishing(channelId);
    await fetch("/api/admin/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, channelId }),
    });
    setPublishing(null);
    router.refresh();
  }

  if (channels.length === 0) {
    return <span className="text-xs text-muted-foreground">Нет каналов</span>;
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="rounded-lg border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5">
        Опубликовать
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-border bg-card p-3 shadow-xl">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">Каналы</div>
          <div className="space-y-1.5">
            {channels.map((ch) => {
              const published = publishedChannelIds.includes(ch.id);
              return (
                <div key={ch.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-secondary/50">
                  <div className="flex items-center gap-2 text-xs">
                    <span>{PLATFORM_EMOJI[ch.platform] || "📌"}</span>
                    <span className="font-medium">{ch.name}</span>
                  </div>
                  {published ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Опубликовано</span>
                  ) : (
                    <button
                      onClick={() => publish(ch.id)}
                      disabled={publishing === ch.id || !ch.isActive}
                      className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
                    >
                      {publishing === ch.id ? "..." : "Отправить"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={() => setOpen(false)} className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground">Закрыть</button>
        </div>
      )}
    </div>
  );
}
