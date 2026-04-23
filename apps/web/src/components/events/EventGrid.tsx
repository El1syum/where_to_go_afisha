import { EventCard } from "./EventCard";
import { LoadMore } from "./LoadMore";

interface EventGridProps {
  events: Array<{
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
    source?: string | null;
    category: { slug: string; name: string; icon: string | null };
  }>;
  citySlug: string;
  categorySlug?: string;
  total?: number;
}

export function EventGrid({ events, citySlug, categorySlug, total }: EventGridProps) {
  if (events.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-gray-500">Мероприятий не найдено</p>
      </div>
    );
  }

  const totalCount = total ?? events.length;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {events.map((event) => (
        <EventCard key={event.slug} event={event} citySlug={citySlug} />
      ))}
      <LoadMore
        citySlug={citySlug}
        categorySlug={categorySlug}
        initialTotal={totalCount}
        initialLoaded={events.length}
      />
    </div>
  );
}
