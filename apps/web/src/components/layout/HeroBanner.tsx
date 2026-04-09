"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface HeroBannerProps {
  citySlug: string;
  /** Per-slide URLs loaded from Settings (banner_url_1..5). Empty/null = not clickable. */
  links?: (string | null)[];
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

export function HeroBanner({ citySlug: _citySlug, links = [] }: HeroBannerProps) {
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

  const currentLink = links[current]?.trim() || null;
  const isClickable = !!currentLink;
  const isExternal = isClickable && /^https?:\/\//i.test(currentLink!);

  const content = (
    <>
      {/* Current + previous image only (not all 5) */}
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
      <Image
        key={`cur-${current}`}
        src={SLIDES[current].image}
        alt={SLIDES[current].title}
        fill
        className="object-cover transition-all duration-700 ease-in-out"
        style={{ opacity: 1, transform: "scale(1)", zIndex: 2 }}
        sizes="(max-width: 1280px) 100vw, 1200px"
        priority={current === 0}
      />

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
        <div key={`cta-${current}`} className="mb-6" />

        {/* Dots indicator — stopPropagation so clicks don't trigger the wrapping link */}
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goTo(i);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Слайд ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </>
  );

  const wrapperClasses = `relative mb-8 block overflow-hidden rounded-2xl ${
    isClickable ? "cursor-pointer" : ""
  }`;

  if (isClickable) {
    return (
      <a
        href={currentLink!}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className={wrapperClasses}
        style={{ minHeight: 320 }}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={wrapperClasses} style={{ minHeight: 320 }}>
      {content}
    </div>
  );
}
