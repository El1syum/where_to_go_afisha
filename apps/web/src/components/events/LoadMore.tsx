"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { EventCard } from "./EventCard";

interface Event {
  slug: string;
  title: string;
  date: Date | string;
  place: string | null;
  price: unknown;
  imageUrl: string | null;
  isKids: boolean;
  isPremiere: boolean;
  age: number | null;
  category: { slug: string; name: string; icon: string | null };
}

interface LoadMoreProps {
  citySlug: string;
  categorySlug?: string;
  initialTotal: number;
  initialLoaded: number;
  dateFilter?: string;
  exactDate?: string;
}

export function LoadMore({
  citySlug,
  categorySlug,
  initialTotal,
  initialLoaded,
  dateFilter,
  exactDate,
}: LoadMoreProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [page, setPage] = useState(2);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialLoaded < initialTotal);
  const observerRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const params = new URLSearchParams({
      city: citySlug,
      page: String(page),
      limit: "24",
    });
    if (categorySlug) params.set("category", categorySlug);

    const res = await fetch(`/api/events?${params}`);
    const data = await res.json();

    if (data.events.length === 0) {
      setHasMore(false);
    } else {
      setEvents((prev) => [...prev, ...data.events]);
      setPage((p) => p + 1);
      if (page >= data.pagination.totalPages) {
        setHasMore(false);
      }
    }
    setLoading(false);
  }, [citySlug, categorySlug, page, loading, hasMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!observerRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  if (!hasMore && events.length === 0) return null;

  return (
    <>
      {events.map((event) => (
        <EventCard key={event.slug} event={event} citySlug={citySlug} />
      ))}

      {hasMore && (
        <div ref={observerRef} className="col-span-full flex justify-center py-8">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Загрузка...
            </div>
          ) : (
            <div className="h-8" />
          )}
        </div>
      )}
    </>
  );
}
