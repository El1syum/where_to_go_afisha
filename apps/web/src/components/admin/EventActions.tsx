"use client";

import { useRouter } from "next/navigation";

export function EventActions({ eventId, isActive }: { eventId: number; isActive: boolean }) {
  const router = useRouter();

  async function toggleActive() {
    await fetch(`/api/admin/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
  }

  return (
    <div className="flex gap-1">
      <button
        onClick={toggleActive}
        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
          isActive
            ? "text-red-600 hover:bg-red-50"
            : "text-green-600 hover:bg-green-50"
        }`}
      >
        {isActive ? "Скрыть" : "Показать"}
      </button>
    </div>
  );
}
