"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface CityConfirmationProps {
  currentCityName: string;
  cities: Array<{ slug: string; name: string }>;
  onOpenCitySelector: () => void;
}

export function CityConfirmation({
  currentCityName,
  cities,
  onOpenCitySelector,
}: CityConfirmationProps) {
  const params = useParams();
  const router = useRouter();
  const citySlug = params?.city as string;
  const [visible, setVisible] = useState(false);
  const [detectedCity, setDetectedCity] = useState<{
    slug: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    // Don't show if user already confirmed
    const confirmed = document.cookie
      .split("; ")
      .find((c) => c.startsWith("city_confirmed="));
    if (confirmed) return;

    // Detect city via API (only show popup, never redirect)
    fetch("/api/geo")
      .then((r) => r.json())
      .then((data) => {
        if (data.city && data.cityName) {
          setDetectedCity({ slug: data.city, name: data.cityName });
        } else {
          setDetectedCity({ slug: citySlug, name: currentCityName });
        }
        setVisible(true);
      })
      .catch(() => {
        // Geo failed — still show confirmation for current city
        setDetectedCity({ slug: citySlug, name: currentCityName });
        setVisible(true);
      });
  }, []);

  function confirmCity() {
    const slug = detectedCity?.slug || citySlug;
    document.cookie = `preferred_city=${slug};path=/;max-age=${365 * 24 * 60 * 60}`;
    document.cookie = `city_confirmed=1;path=/;max-age=${365 * 24 * 60 * 60}`;
    setVisible(false);
    // Redirect only if user confirms a different city
    if (slug !== citySlug) {
      router.push(`/${slug}`);
    }
  }

  function chooseAnother() {
    setVisible(false);
    onOpenCitySelector();
  }

  if (!visible || !detectedCity) return null;

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-border bg-card p-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
      <p className="mb-3 text-sm font-medium">
        Ваш город — {detectedCity.name}?
      </p>
      <div className="flex gap-2">
        <button
          onClick={confirmCity}
          className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Да
        </button>
        <button
          onClick={chooseAnother}
          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
        >
          Нет, другой
        </button>
      </div>
    </div>
  );
}
