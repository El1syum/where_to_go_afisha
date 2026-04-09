"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

export interface HeroBannerSlide {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string | null;
}

interface HeroBannerProps {
  citySlug: string;
  banners: HeroBannerSlide[];
}

export function HeroBanner({ citySlug: _citySlug, banners }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);

  const total = banners.length;

  const goTo = useCallback(
    (next: number) => {
      if (animating || next === current || total === 0) return;
      setPrev(current);
      setCurrent(next);
      setAnimating(true);
      setTimeout(() => {
        setPrev(null);
        setAnimating(false);
      }, 800);
    },
    [current, animating, total]
  );

  const next = useCallback(() => {
    if (total > 0) goTo((current + 1) % total);
  }, [current, goTo, total]);

  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, total]);

  // Reset current if banners prop shrinks below it
  useEffect(() => {
    if (current >= total && total > 0) setCurrent(0);
  }, [total, current]);

  if (total === 0) return null;

  const slide = banners[current];
  const prevSlide = prev !== null ? banners[prev] : null;
  const currentLink = slide.linkUrl?.trim() || null;
  const isClickable = !!currentLink;
  const isExternal = isClickable && /^https?:\/\//i.test(currentLink!);

  const content = (
    <>
      {/* Current + previous image only */}
      {prevSlide && (
        <Image
          key={`prev-${prev}`}
          src={prevSlide.imageUrl}
          alt=""
          fill
          className="object-cover transition-opacity duration-700 ease-in-out"
          style={{ opacity: 0, zIndex: 1 }}
          sizes="(max-width: 1280px) 100vw, 1200px"
          unoptimized={prevSlide.imageUrl.startsWith("/api/images/")}
        />
      )}
      <Image
        key={`cur-${slide.id}`}
        src={slide.imageUrl}
        alt={slide.title}
        fill
        className="object-cover transition-all duration-700 ease-in-out"
        style={{ opacity: 1, transform: "scale(1)", zIndex: 2 }}
        sizes="(max-width: 1280px) 100vw, 1200px"
        priority={current === 0}
        unoptimized={slide.imageUrl.startsWith("/api/images/")}
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 z-[3] bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

      {/* Content */}
      <div className="relative z-[4] flex min-h-[280px] flex-col justify-end p-6 sm:min-h-[320px] sm:p-8 lg:min-h-[360px]">
        <h2
          key={`title-${slide.id}`}
          className="mb-2 animate-[fadeSlideUp_0.6s_ease-out] text-2xl font-bold text-white sm:text-3xl lg:text-4xl"
        >
          {slide.title}
        </h2>
        <p
          key={`sub-${slide.id}`}
          className="mb-4 animate-[fadeSlideUp_0.6s_0.1s_ease-out_both] text-sm text-white/80 sm:text-base"
        >
          {slide.subtitle}
        </p>
        <div key={`cta-${slide.id}`} className="mb-6" />

        {/* Dots indicator */}
        {total > 1 && (
          <div className="flex gap-2">
            {banners.map((b, i) => (
              <button
                key={b.id}
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
        )}
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
