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
    isAvailable: boolean;
    age: number | null;
    category: { slug: string; name: string; icon: string | null };
  };
  citySlug: string;
}

export function EventCard({ event, citySlug }: EventCardProps) {
  const priceText = formatPrice(event.price, event.isAvailable);
  const isFree = priceText === "Бесплатно";

  return (
    <Link
      href={`/${citySlug}/${event.category.slug}/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
    >
      <div className="relative z-0 aspect-[4/3] overflow-hidden">
        {event.imageUrl ? (() => {
          const isKassir = event.imageUrl!.includes("kassir.ru") || event.slug.includes("-k-");
          return (
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className={isKassir
                ? "object-contain bg-white transition-transform duration-500 group-hover:scale-105"
                : "object-cover transition-transform duration-500 group-hover:scale-105"
              }
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          );
        })() : (
          <div className="flex h-full items-center justify-center bg-gray-100 text-5xl opacity-30">
            {event.category.icon || "📌"}
          </div>
        )}

        {/* Badges on image */}
        <div className="absolute left-2 top-2 flex gap-1.5">
          {event.isPremiere && (
            <span className="rounded-md bg-indigo-500 px-2 py-0.5 text-xs font-medium text-white">
              Премьера
            </span>
          )}
          {event.isKids && (
            <span className="rounded-md bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
              Детское
            </span>
          )}
        </div>

        {event.age != null && (
          <span className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
            {event.age}+
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* Category */}
        <div className="mb-1 flex items-center gap-1 text-xs uppercase tracking-wide text-gray-500">
          {event.category.icon && <span>{event.category.icon}</span>}
          <span>{event.category.name}</span>
        </div>

        {/* Title */}
        <h3 className="mb-2 line-clamp-2 text-base font-semibold leading-snug text-gray-900 group-hover:text-indigo-600">
          {event.title}
        </h3>

        {/* Date */}
        <p className="text-sm text-gray-500">
          {formatDate(event.date)}
        </p>

        {/* Venue */}
        {event.place && (
          <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">
            {event.place}
          </p>
        )}

        {/* Price */}
        <p className={`mt-auto pt-2 text-base font-bold ${isFree ? "text-green-600" : "text-gray-900"}`}>
          {priceText}
        </p>
      </div>
    </Link>
  );
}
