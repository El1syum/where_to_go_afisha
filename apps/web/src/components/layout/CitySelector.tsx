"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface City {
  slug: string;
  name: string;
}

interface CitySelectorProps {
  cities: City[];
  currentSlug?: string;
  onClose: () => void;
}

export function CitySelector({ cities, currentSlug, onClose }: CitySelectorProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return cities;
    const q = search.toLowerCase();
    return cities.filter((c) => c.name.toLowerCase().includes(q));
  }, [cities, search]);

  // Group by first letter
  const grouped = useMemo(() => {
    const map = new Map<string, City[]>();
    for (const city of filtered) {
      const letter = city.name[0]?.toUpperCase() || "#";
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(city);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "ru"));
  }, [filtered]);

  function selectCity(slug: string) {
    document.cookie = `preferred_city=${slug};path=/;max-age=${365 * 24 * 60 * 60}`;
    document.cookie = `city_confirmed=1;path=/;max-age=${365 * 24 * 60 * 60}`;
    router.push(`/${slug}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-20" onClick={onClose}>
      <div
        className="mx-4 max-h-[70vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border p-4">
          <h2 className="mb-3 text-lg font-semibold">Выберите город</h2>
          <input
            type="text"
            placeholder="Поиск города..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm outline-none focus:border-primary"
            autoFocus
          />
        </div>

        <div className="overflow-y-auto p-4" style={{ maxHeight: "50vh" }}>
          {grouped.map(([letter, letterCities]) => (
            <div key={letter} className="mb-4">
              <div className="mb-2 text-sm font-semibold text-muted-foreground">{letter}</div>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {letterCities.map((city) => (
                  <button
                    key={city.slug}
                    onClick={() => selectCity(city.slug)}
                    className={`rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary ${
                      city.slug === currentSlug ? "bg-primary/10 font-medium text-primary" : ""
                    }`}
                  >
                    {city.name}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {grouped.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">Город не найден</p>
          )}
        </div>
      </div>
    </div>
  );
}
