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
      className="group flex-shrink-0 w-44 sm:w-52 overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative z-0 aspect-[4/3] overflow-hidden bg-secondary">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            className={
              isKassir
                ? "object-contain bg-white transition-transform duration-500 group-hover:scale-110"
                : "object-cover transition-transform duration-500 group-hover:scale-110"
            }
            sizes="208px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl opacity-30">
            {event.category.icon || "📌"}
          </div>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="mb-1 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
          {event.title}
        </h3>
        <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
      </div>
    </Link>
  );
}

function CollectionRow({
  title,
  events,
  citySlug,
}: {
  title: string;
  events: CollectionEvent[];
  citySlug: string;
}) {
  if (events.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-bold">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
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
      <CollectionRow title="Концерты и шоу" events={concerts} citySlug={citySlug} />
      <CollectionRow title="Для детей" events={kids} citySlug={citySlug} />
    </div>
  );
}
