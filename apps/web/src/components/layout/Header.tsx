"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CitySelector } from "./CitySelector";
import { CityConfirmation } from "./CityConfirmation";

interface HeaderProps {
  cities: Array<{ slug: string; name: string }>;
  currentCityName?: string;
}

export function Header({ cities, currentCityName }: HeaderProps) {
  const params = useParams();
  const citySlug = params?.city as string | undefined;
  const [showCitySelector, setShowCitySelector] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href={citySlug ? `/${citySlug}` : "/"} className="text-xl font-bold text-primary">
            Куда сходить?
          </Link>

          <div className="flex items-center gap-4">
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
