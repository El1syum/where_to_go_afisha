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
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative z-0 aspect-[4/3] overflow-hidden bg-secondary">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl opacity-30">
            {event.category.icon || "📌"}
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Badges */}
        <div className="absolute left-2.5 top-2.5 flex gap-1.5">
          {event.isPremiere && (
            <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground shadow-sm">
              Премьера
            </span>
          )}
          {event.isKids && (
            <span className="rounded-full bg-green-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              Детское
            </span>
          )}
        </div>

        {event.age != null && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {event.age}+
          </span>
        )}

        {/* Price tag on image */}
        <div className="absolute bottom-2.5 right-2.5">
          <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-bold text-foreground shadow-sm backdrop-blur-sm">
            {formatPrice(event.price)}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="mb-1.5 flex items-center gap-1 text-xs font-medium text-primary">
          <span>{event.category.icon}</span>
          <span>{event.category.name}</span>
        </div>
        <h3 className="mb-2 line-clamp-2 text-sm font-bold leading-snug group-hover:text-primary">
          {event.title}
        </h3>
        <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDate(event.date)}</span>
          {event.place && (
            <>
              <span className="text-border">·</span>
              <span className="line-clamp-1">{event.place}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
