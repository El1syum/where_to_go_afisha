"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CitySelector } from "./CitySelector";
import { CityConfirmation } from "./CityConfirmation";

interface HeaderProps {
  cities: Array<{ slug: string; name: string }>;
  currentCityName?: string;
}

export function Header({ cities, currentCityName }: HeaderProps) {
  const params = useParams();
  const router = useRouter();
  const citySlug = params?.city as string | undefined;
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q && citySlug) {
      router.push(`/${citySlug}/search?q=${encodeURIComponent(q)}`);
      setSearchQuery("");
      setShowSearch(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#1e1b3a]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Left: City | Brand */}
          <Link href={citySlug ? `/${citySlug}` : "/"} className="flex shrink-0 items-center gap-2 font-bold">
            {currentCityName && (
              <>
                <span className="text-lg text-white">{currentCityName}</span>
                <span className="text-white/30">|</span>
              </>
            )}
            <span className="text-lg text-indigo-400">Куда сходить?</span>
          </Link>

          {/* Right: icons */}
          <div className="flex items-center gap-1">
            {/* City selector */}
            {currentCityName && (
              <div className="relative">
                <button
                  onClick={() => setShowCitySelector(true)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{currentCityName}</span>
                </button>

                <CityConfirmation
                  currentCityName={currentCityName}
                  cities={cities}
                  onOpenCitySelector={() => setShowCitySelector(true)}
                />
              </div>
            )}

            {/* Search toggle */}
            {citySlug && (
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Поиск"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Search overlay */}
        {showSearch && citySlug && (
          <div className="border-t border-white/10 px-4 py-3 sm:px-6">
            <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск мероприятий..."
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-white/10 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            </form>
          </div>
        )}
      </header>

      {showCitySelector && (
        <CitySelector
          cities={cities}
          currentSlug={citySlug}
          onClose={() => setShowCitySelector(false)}
        />
      )}
    </>
  );
}
