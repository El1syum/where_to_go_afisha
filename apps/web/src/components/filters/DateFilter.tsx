"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const FILTER_BUTTONS = [
  { key: "today", label: "Сегодня" },
  { key: "tomorrow", label: "Завтра" },
  { key: "weekend", label: "Выходные" },
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
] as const;

export function DateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeFilter = searchParams.get("date") || "";
  const activeExact = searchParams.get("exact") || "";

  const setFilter = useCallback(
    (key: string, exact?: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (exact) {
        params.delete("date");
        params.set("exact", exact);
      } else if (key) {
        params.set("date", key);
        params.delete("exact");
      } else {
        params.delete("date");
        params.delete("exact");
      }

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <button
        onClick={() => setFilter("")}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          !activeFilter && !activeExact
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        }`}
      >
        Все даты
      </button>

      {FILTER_BUTTONS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setFilter(key)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            activeFilter === key
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          {label}
        </button>
      ))}

      <input
        type="date"
        value={activeExact}
        onChange={(e) => {
          const val = e.target.value;
          if (val) {
            setFilter("", val);
          } else {
            setFilter("");
          }
        }}
        className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
          activeExact
            ? "border-primary bg-primary/10 text-foreground"
            : "border-border bg-secondary text-secondary-foreground"
        }`}
      />
    </div>
  );
}
