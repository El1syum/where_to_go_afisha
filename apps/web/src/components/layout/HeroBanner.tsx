"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface HeroBannerProps {
  citySlug: string;
  cityName: string;
}

const SLIDES = [
  {
    title: "Самые яркие события города!",
    subtitle: "Концерты, театр, выставки и многое другое",
    gradient: "from-indigo-900/80 via-indigo-900/40 to-transparent",
    bgColor: "bg-gradient-to-br from-indigo-600 to-purple-700",
  },
  {
    title: "Не пропусти лучшие концерты",
    subtitle: "Живая музыка и незабываемые впечатления",
    gradient: "from-rose-900/80 via-rose-900/40 to-transparent",
    bgColor: "bg-gradient-to-br from-rose-600 to-orange-600",
  },
  {
    title: "Театральный сезон открыт",
    subtitle: "Премьеры, классика и современные постановки",
    gradient: "from-emerald-900/80 via-emerald-900/40 to-transparent",
    bgColor: "bg-gradient-to-br from-emerald-600 to-teal-600",
  },
  {
    title: "Культурные выходные",
    subtitle: "Выставки, лекции и мастер-классы",
    gradient: "from-amber-900/80 via-amber-900/40 to-transparent",
    bgColor: "bg-gradient-to-br from-amber-600 to-yellow-600",
  },
  {
    title: "Весело всей семьёй!",
    subtitle: "Детские мероприятия и развлечения",
    gradient: "from-cyan-900/80 via-cyan-900/40 to-transparent",
    bgColor: "bg-gradient-to-br from-cyan-600 to-blue-600",
  },
];

export function HeroBanner({ citySlug, cityName }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = SLIDES[current];

  return (
    <div className="mb-8 flex gap-5">
      {/* Main banner */}
      <div className={`relative flex-1 overflow-hidden rounded-2xl ${slide.bgColor} min-h-[280px] sm:min-h-[320px] lg:min-h-[360px]`}>
        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t ${slide.gradient}`} />

        {/* Content */}
        <div className="relative flex h-full min-h-[280px] flex-col justify-end p-6 sm:min-h-[320px] sm:p-8 lg:min-h-[360px]">
          <h2 className="mb-2 text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            {slide.title}
          </h2>
          <p className="mb-4 text-sm text-white/80 sm:text-base">
            {slide.subtitle}
          </p>
          <div className="mb-6">
            <Link
              href={`/${citySlug}`}
              className="inline-block rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Выбрать событие
            </Link>
          </div>

          {/* Dots indicator */}
          <div className="flex gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current ? "w-6 bg-white" : "w-2 bg-white/50"
                }`}
                aria-label={`Слайд ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Side promo block (desktop only) */}
      <div className="hidden w-[280px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 p-6 lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-white/80">Подписывайтесь</p>
          <h3 className="text-xl font-bold text-white">Мероприятия {cityName}</h3>
          <p className="mt-2 text-sm text-white/70">
            Получайте уведомления о новых событиях в вашем городе
          </p>
        </div>
        <Link
          href={`/${citySlug}`}
          className="mt-4 inline-block rounded-full bg-white/20 px-5 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-white/30"
        >
          Подробнее
        </Link>
      </div>
    </div>
  );
}
