"use client";

import { useRouter } from "next/navigation";

export function ToggleSwitch({ apiUrl, isActive }: { apiUrl: string; isActive: boolean }) {
  const router = useRouter();

  async function toggle() {
    await fetch(apiUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      className={`h-5 w-9 rounded-full transition-colors ${isActive ? "bg-green-500" : "bg-gray-300"}`}
    >
      <span
        className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-0.5"}`}
      />
    </button>
  );
}
