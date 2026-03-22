import Image from "next/image";
import Link from "next/link";
import { formatPrice, formatDate } from "@/lib/utils";

interface EventCardProps {
  event: {
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
  };
  citySlug: string;
}

export function EventCard({ event, citySlug }: EventCardProps) {
  return (
    <Link
      href={`/${citySlug}/${event.category.slug}/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-muted-foreground">
            {event.category.icon || "📌"}
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-2 top-2 flex gap-1">
          {event.isPremiere && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              Премьера
            </span>
          )}
          {event.isKids && (
            <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
              Детское
            </span>
          )}
        </div>

        {event.age != null && (
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
            {event.age}+
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 text-xs font-medium text-primary">
          {event.category.icon} {event.category.name}
        </div>
        <h3 className="mb-2 line-clamp-2 text-sm font-semibold leading-tight group-hover:text-primary">
          {event.title}
        </h3>
        <div className="mt-auto space-y-1 text-xs text-muted-foreground">
          <p>{formatDate(event.date)}</p>
          {event.place && <p className="line-clamp-1">{event.place}</p>}
          <p className="font-semibold text-foreground">{formatPrice(event.price)}</p>
        </div>
      </div>
    </Link>
  );
}
