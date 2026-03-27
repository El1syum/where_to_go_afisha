"use client";

import { useRouter } from "next/navigation";

export function ReviewActions({ reviewId, status }: { reviewId: number; status: "pending" | "approved" }) {
  const router = useRouter();

  async function approve() {
    await fetch(`/api/admin/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isApproved: true }),
    });
    router.refresh();
  }

  async function reject() {
    if (!confirm("Удалить отзыв?")) return;
    await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
    router.refresh();
  }

  async function hide() {
    await fetch(`/api/admin/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isApproved: false }),
    });
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {status === "pending" && (
        <button onClick={approve} className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600">
          Одобрить
        </button>
      )}
      {status === "approved" && (
        <button onClick={hide} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary">
          Скрыть
        </button>
      )}
      <button onClick={reject} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
        Удалить
      </button>
    </div>
  );
}
