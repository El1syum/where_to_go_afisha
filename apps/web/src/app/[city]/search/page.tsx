import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { EventGrid } from "@/components/events/EventGrid";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/JsonLd";

interface SearchPageProps {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ params, searchParams }: SearchPageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const { q } = await searchParams;

  const city = await prisma.city.findUnique({
    where: { slug: citySlug },
    select: { name: true, namePrepositional: true },
  });

  if (!city) return {};

  const cityIn = city.namePrepositional || city.name;

  return {
    title: q
      ? `${q} — поиск мероприятий в ${cityIn}`
      : `Поиск мероприятий в ${cityIn}`,
    description: `Поиск мероприятий в ${cityIn}. Концерты, театр, выставки, экскурсии, спорт.`,
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { city: citySlug } = await params;
  const { q } = await searchParams;

  const city = await prisma.city.findUnique({
    where: { slug: citySlug },
    select: { id: true, name: true, namePrepositional: true },
  });

  if (!city) notFound();

  const query = q?.trim() || "";
  const cityIn = city.namePrepositional || city.name;

  const events = query
    ? await prisma.event.findMany({
        where: {
          cityId: city.id,
          isActive: true,
          isApproved: true,
          date: { gte: new Date() },
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { place: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          category: { select: { slug: true, name: true, icon: true } },
        },
        orderBy: { date: "asc" },
        take: 48,
      })
    : [];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Главная", url: siteUrl },
          { name: city.name, url: `${siteUrl}/${citySlug}` },
          { name: "Поиск", url: `${siteUrl}/${citySlug}/search` },
        ])}
      />

      <h1 className="mb-6 text-2xl font-bold md:text-3xl">
        {query
          ? `Результаты поиска: "${query}"`
          : `Поиск мероприятий в ${cityIn}`}
      </h1>

      {query && events.length > 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          Найдено мероприятий: {events.length}
        </p>
      )}

      {query ? (
        <EventGrid events={events} citySlug={citySlug} />
      ) : (
        <div className="py-16 text-center">
          <p className="text-lg text-muted-foreground">
            Введите запрос для поиска мероприятий
          </p>
        </div>
      )}
    </>
  );
}
