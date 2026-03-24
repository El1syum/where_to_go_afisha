"use client";

import { useState, useRef, useEffect } from "react";

interface City {
  slug: string;
  name: string;
}

interface CitySelectProps {
  cities: City[];
  name: string;
  defaultValue?: string;
}

export function CitySelect({ cities, name, defaultValue = "" }: CitySelectProps) {
  const sorted = [...cities].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(defaultValue);
  const ref = useRef<HTMLDivElement>(null);

  const selectedName = sorted.find((c) => c.slug === selected)?.name || "Все";

  const filtered = search
    ? sorted.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <input type="hidden" name={name} value={selected} />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full min-w-[180px] rounded-lg border border-border bg-background px-3 py-2 text-left text-sm outline-none focus:border-primary"
      >
        {selectedName}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-border bg-card shadow-xl">
          <div className="border-b border-border p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск города..."
              autoFocus
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => { setSelected(""); setOpen(false); setSearch(""); }}
              className={`w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${!selected ? "bg-primary/10 font-medium text-primary" : "hover:bg-secondary"}`}
            >
              Все
            </button>
            {filtered.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => { setSelected(c.slug); setOpen(false); setSearch(""); }}
                className={`w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${selected === c.slug ? "bg-primary/10 font-medium text-primary" : "hover:bg-secondary"}`}
              >
                {c.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">Не найдено</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
