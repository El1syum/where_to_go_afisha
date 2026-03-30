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
  const [prev, setPrev] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback((next: number) => {
    if (animating || next === current) return;
    setPrev(current);
    setCurrent(next);
    setAnimating(true);
    setTimeout(() => {
      setPrev(null);
      setAnimating(false);
    }, 800);
  }, [current, animating]);

  const next = useCallback(() => {
    goTo((current + 1) % SLIDES.length);
  }, [current, goTo]);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl" style={{ minHeight: 320 }}>
      {/* Previous image (fading out) */}
      {prev !== null && (
        <Image
          key={`prev-${prev}`}
          src={SLIDES[prev].image}
          alt=""
          fill
          className="object-cover transition-opacity duration-700 ease-in-out"
          style={{ opacity: 0, zIndex: 1 }}
          sizes="(max-width: 1280px) 100vw, 1200px"
        />
      )}

      {/* All images stacked, only current visible */}
      {SLIDES.map((slide, i) => (
        <Image
          key={slide.image}
          src={slide.image}
          alt={slide.title}
          fill
          className="object-cover transition-all duration-700 ease-in-out"
          style={{
            opacity: i === current ? 1 : 0,
            transform: i === current ? "scale(1)" : "scale(1.05)",
            zIndex: i === current ? 2 : 0,
          }}
          sizes="(max-width: 1280px) 100vw, 1200px"
          priority={i === 0}
        />
      ))}

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 z-[3] bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

      {/* Content */}
      <div className="relative z-[4] flex min-h-[280px] flex-col justify-end p-6 sm:min-h-[320px] sm:p-8 lg:min-h-[360px]">
        <h2
          key={`title-${current}`}
          className="mb-2 animate-[fadeSlideUp_0.6s_ease-out] text-2xl font-bold text-white sm:text-3xl lg:text-4xl"
        >
          {SLIDES[current].title}
        </h2>
        <p
          key={`sub-${current}`}
          className="mb-4 animate-[fadeSlideUp_0.6s_0.1s_ease-out_both] text-sm text-white/80 sm:text-base"
        >
          {SLIDES[current].subtitle}
        </p>
        <div
          key={`cta-${current}`}
          className="mb-6 animate-[fadeSlideUp_0.6s_0.2s_ease-out_both]"
        >
          {/* <Link
            href={`/${citySlug}`}
            className="inline-block rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Выбрать событие
          </Link> */}
        </div>

        {/* Dots indicator */}
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Слайд ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
