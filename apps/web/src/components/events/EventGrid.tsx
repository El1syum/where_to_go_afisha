import { EventCard } from "./EventCard";

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
    age: number | null;
    category: { slug: string; name: string; icon: string | null };
  }>;
  citySlug: string;
}

export function EventGrid({ events, citySlug }: EventGridProps) {
  if (events.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-muted-foreground">Мероприятий не найдено</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {events.map((event) => (
        <EventCard key={event.slug} event={event} citySlug={citySlug} />
      ))}
    </div>
  );
}
