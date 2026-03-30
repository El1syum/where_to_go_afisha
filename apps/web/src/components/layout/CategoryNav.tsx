"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState, useEffect } from "react";

interface Category {
  slug: string;
  name: string;
  icon: string | null;
}

interface CategoryNavProps {
  categories: Category[];
}

export function CategoryNav({ categories }: CategoryNavProps) {
  const params = useParams();
  const citySlug = params?.city as string;
  const activeCategory = params?.category as string | undefined;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  function checkScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 10);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  function scroll(dir: number) {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  }

  return (
    <nav>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Left fade + arrow */}
        {showLeft && (
          <button
            onClick={() => scroll(-1)}
            className="absolute left-0 top-0 z-10 flex h-full w-10 items-center justify-start bg-gradient-to-r from-[#1e1b3a] via-[#1e1b3a]/80 to-transparent pl-1"
          >
            <svg className="h-5 w-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-2 overflow-x-auto py-3 scrollbar-hide"
        >
          <Link
            href={`/${citySlug}`}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              !activeCategory
                ? "bg-indigo-500 text-white shadow-sm"
                : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
            }`}
          >
            Все
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/${citySlug}/${cat.slug}`}
              className={`flex shrink-0 items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat.slug
                  ? "bg-indigo-500 text-white shadow-sm"
                  : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              }`}
            >
              {cat.icon && <span>{cat.icon}</span>}
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Right fade + arrow */}
        {showRight && (
          <button
            onClick={() => scroll(1)}
            className="absolute right-0 top-0 z-10 flex h-full w-10 items-center justify-end bg-gradient-to-l from-[#1e1b3a] via-[#1e1b3a]/80 to-transparent pr-1"
          >
            <svg className="h-5 w-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </nav>
  );
}
