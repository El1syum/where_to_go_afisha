"use client";

import { useEffect, useRef, useState } from "react";
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
  isAvailable: boolean;
  age: number | null;
  category: { slug: string; name: string; icon: string | null };
}

interface LoadMoreProps {
  citySlug: string;
  categorySlug?: string;
  initialTotal: number;
  initialLoaded: number;
}

export function LoadMore({
  citySlug,
  categorySlug,
  initialTotal,
  initialLoaded,
}: LoadMoreProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initialLoaded >= initialTotal);
  const pageRef = useRef(2);
  const loadingRef = useRef(false);
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEvents([]);
    setDone(initialLoaded >= initialTotal);
    pageRef.current = 2;
  }, [citySlug, categorySlug, initialTotal, initialLoaded]);

  useEffect(() => {
    if (done || !observerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          loadingRef.current = true;
          setLoading(true);

          const params = new URLSearchParams({
            city: citySlug,
            page: String(pageRef.current),
            limit: "24",
          });
          if (categorySlug) params.set("category", categorySlug);

          fetch(`/api/events?${params}`)
            .then((r) => r.json())
            .then((data) => {
              if (data.events.length === 0 || pageRef.current >= data.pagination.totalPages) {
                setDone(true);
              }
              if (data.events.length > 0) {
                setEvents((prev) => [...prev, ...data.events]);
                pageRef.current += 1;
              }
              setLoading(false);
              loadingRef.current = false;
            })
            .catch(() => {
              setLoading(false);
              loadingRef.current = false;
            });
        }
      },
      { rootMargin: "400px" }
    );

    const el = observerRef.current;
    observer.observe(el);
    return () => observer.disconnect();
  }, [done, citySlug, categorySlug]);

  if (done && events.length === 0) return null;

  return (
    <>
      {events.map((event) => (
        <EventCard key={event.slug} event={event} citySlug={citySlug} />
      ))}

      {!done && (
        <div ref={observerRef} className="col-span-full flex justify-center py-8">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Загрузка...
            </div>
          )}
        </div>
      )}
    </>
  );
}
