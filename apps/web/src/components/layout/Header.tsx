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
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q && citySlug) {
      router.push(`/${citySlug}/search?q=${encodeURIComponent(q)}`);
      setSearchQuery("");
      setShowMobileSearch(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href={citySlug ? `/${citySlug}` : "/"} className="shrink-0 font-bold">
            {currentCityName && <span className="hidden text-xl text-foreground sm:inline">{currentCityName} | </span>}
            <span className="text-lg text-primary sm:text-xl">Куда сходить?</span>
          </Link>

          {/* Desktop search */}
          {citySlug && (
            <form onSubmit={handleSearch} className="hidden flex-1 md:flex md:max-w-md">
              <div className="relative w-full">
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск мероприятий..."
                  className="w-full rounded-lg border border-border bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </form>
          )}

          <div className="flex items-center gap-2">
            {/* Mobile search toggle */}
            {citySlug && (
              <button
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="rounded-lg p-2 transition-colors hover:bg-secondary md:hidden"
                aria-label="Поиск"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            )}

            {currentCityName && (
              <div className="relative">
                <button
                  onClick={() => setShowCitySelector(true)}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {currentCityName}
                </button>

                <CityConfirmation
                  currentCityName={currentCityName}
                  cities={cities}
                  onOpenCitySelector={() => setShowCitySelector(true)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile search bar */}
        {showMobileSearch && citySlug && (
          <div className="border-t border-border px-4 py-3 md:hidden">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск мероприятий..."
                  autoFocus
                  className="w-full rounded-lg border border-border bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
