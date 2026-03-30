import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

interface CollectionEvent {
  slug: string;
  title: string;
  date: Date;
  imageUrl: string | null;
  category: { slug: string; name: string; icon: string | null };
}

function MiniCard({ event, citySlug }: { event: CollectionEvent; citySlug: string }) {
  const isKassir = (event.imageUrl?.includes("kassir.ru") || event.slug.includes("-k-")) ?? false;

  return (
    <Link
      href={`/${citySlug}/${event.category.slug}/${event.slug}`}
      className="group w-44 flex-shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-md sm:w-52"
    >
      <div className="relative z-0 aspect-[4/3] overflow-hidden">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            className={
              isKassir
                ? "object-contain bg-white transition-transform duration-500 group-hover:scale-105"
                : "object-cover transition-transform duration-500 group-hover:scale-105"
            }
            sizes="208px"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-100 text-4xl opacity-30">
            {event.category.icon || "📌"}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="mb-1 line-clamp-2 text-sm font-semibold leading-snug text-gray-900 group-hover:text-indigo-600">
          {event.title}
        </h3>
        <p className="text-xs text-gray-500">{formatDate(event.date)}</p>
      </div>
    </Link>
  );
}

function CollectionRow({
  title,
  linkHref,
  events,
  citySlug,
}: {
  title: string;
  linkHref?: string;
  events: CollectionEvent[];
  citySlug: string;
}) {
  if (events.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {linkHref && (
          <Link href={linkHref} className="text-sm font-medium text-indigo-500 hover:text-indigo-600">
            Смотреть все &rarr;
          </Link>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {events.map((event) => (
          <MiniCard key={event.slug} event={event} citySlug={citySlug} />
        ))}
      </div>
    </section>
  );
}

interface CollectionsProps {
  cityId: number;
  citySlug: string;
}

export async function Collections({ cityId, citySlug }: CollectionsProps) {
  const now = new Date();
  const weekLater = new Date();
  weekLater.setDate(weekLater.getDate() + 7);

  const baseWhere = {
    cityId,
    isActive: true,
    isApproved: true,
    date: { gte: now },
  };

  const include = {
    category: { select: { slug: true, name: true, icon: true } },
  } as const;

  const [popular, concerts, kids] = await Promise.all([
    prisma.event.findMany({
      where: { ...baseWhere, date: { gte: now, lte: weekLater } },
      include,
      orderBy: { date: "asc" },
      take: 6,
    }),
    prisma.event.findMany({
      where: { ...baseWhere, category: { slug: "concerts" } },
      include,
      orderBy: { date: "asc" },
      take: 4,
    }),
    prisma.event.findMany({
      where: { ...baseWhere, isKids: true },
      include,
      orderBy: { date: "asc" },
      take: 4,
    }),
  ]);

  if (popular.length === 0 && concerts.length === 0 && kids.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <CollectionRow title="Популярное на этой неделе" events={popular} citySlug={citySlug} />
      <CollectionRow title="Концерты и шоу" linkHref={`/${citySlug}/concerts`} events={concerts} citySlug={citySlug} />
      <CollectionRow title="Для детей" linkHref={`/${citySlug}/kids`} events={kids} citySlug={citySlug} />
    </div>
  );
}
