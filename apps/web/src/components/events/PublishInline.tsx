"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PublishInlineProps {
  eventId: number;
  channelId: number;
  isPublished: boolean;
}

export function PublishInline({ eventId, channelId, isPublished }: PublishInlineProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(isPublished);
  const [error, setError] = useState("");

  async function publish() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, channelId }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(data.error || "Ошибка");
      }
    } catch {
      setError("Ошибка сети");
    }
    setLoading(false);
  }

  if (done) {
    return <span className="text-xs text-green-600">Опубликовано</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-500">{error}</span>}
      <button
        onClick={publish}
        disabled={loading}
        className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "..." : "Опубликовать"}
      </button>
    </div>
  );
}
