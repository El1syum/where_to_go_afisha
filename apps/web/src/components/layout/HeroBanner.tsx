"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

interface HeroBannerProps {
  citySlug: string;
}

const SLIDES = [
  {
    title: "Самые яркие события города!",
    subtitle: "Концерты, театр, выставки и многое другое",
    image: "/banner/concert.jpg",
  },
  {
    title: "Не пропусти лучшие концерты",
    subtitle: "Живая музыка и незабываемые впечатления",
    image: "/banner/music.jpg",
  },
  {
    title: "Театральный сезон открыт",
    subtitle: "Премьеры, классика и современные постановки",
    image: "/banner/theater.jpg",
  },
  {
    title: "Культурные выходные",
    subtitle: "Выставки, лекции и мастер-классы",
    image: "/banner/exhibition.jpg",
  },
  {
    title: "Весело всей семьёй!",
    subtitle: "Детские мероприятия и развлечения",
    image: "/banner/family.jpg",
  },
];

export function HeroBanner({ citySlug }: HeroBannerProps) {
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
    <div className="relative mb-8 overflow-hidden rounded-2xl" style={{ minHeight: 320 }}>
      {/* Background image */}
      <Image
        src={slide.image}
        alt={slide.title}
        fill
        className="object-cover transition-opacity duration-700"
        sizes="(max-width: 1280px) 100vw, 1200px"
        priority
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

      {/* Content */}
      <div className="relative flex min-h-[280px] flex-col justify-end p-6 sm:min-h-[320px] sm:p-8 lg:min-h-[360px]">
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
  );
}
