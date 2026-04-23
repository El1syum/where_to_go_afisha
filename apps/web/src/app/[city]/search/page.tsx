import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { EventGrid } from "@/components/events/EventGrid";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/JsonLd";

interface SearchPageProps {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ q?: string; place?: string }>;
}

export async function generateMetadata({ params, searchParams }: SearchPageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const { q, place } = await searchParams;

  const city = await prisma.city.findUnique({
    where: { slug: citySlug },
    select: { name: true, namePrepositional: true },
  });

  if (!city) return {};

  const cityIn = city.namePrepositional || city.name;

  const titleBase = place
    ? `Мероприятия в ${place}`
    : q
      ? `${q} — поиск мероприятий`
      : `Поиск мероприятий в ${cityIn}`;

  return {
    title: `${titleBase} в ${cityIn}`,
    description: `Мероприятия в ${cityIn}. Концерты, театр, выставки, экскурсии, спорт.`,
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { city: citySlug } = await params;
  const { q, place } = await searchParams;

  const city = await prisma.city.findUnique({
    where: { slug: citySlug },
    select: { id: true, name: true, namePrepositional: true },
  });

  if (!city) notFound();

  const query = q?.trim() || "";
  const placeFilter = place?.trim() || "";
  const cityIn = city.namePrepositional || city.name;

  const where = placeFilter
    ? {
        cityId: city.id,
        isActive: true,
        isApproved: true,
        date: { gte: new Date() },
        place: placeFilter,
      }
    : query
      ? {
          cityId: city.id,
          isActive: true,
          isApproved: true,
          date: { gte: new Date() },
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { place: { contains: query, mode: "insensitive" as const } },
            { description: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : null;

  const events = where
    ? await prisma.event.findMany({
        where,
        include: {
          category: { select: { slug: true, name: true, icon: true } },
        },
        orderBy: { date: "asc" },
        take: 48,
      })
    : [];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  const heading = placeFilter
    ? `Мероприятия в «${placeFilter}»`
    : query
      ? `Результаты поиска: "${query}"`
      : `Поиск мероприятий в ${cityIn}`;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Главная", url: siteUrl },
          { name: city.name, url: `${siteUrl}/${citySlug}` },
          { name: placeFilter || "Поиск", url: `${siteUrl}/${citySlug}/search` },
        ])}
      />

      <h1 className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl">
        {heading}
      </h1>

      {(placeFilter || query) && events.length > 0 && (
        <p className="mb-4 text-sm text-gray-500">
          Найдено мероприятий: {events.length}
        </p>
      )}

      {(placeFilter || query) ? (
        <EventGrid events={events} citySlug={citySlug} />
      ) : (
        <div className="py-16 text-center">
          <p className="text-lg text-gray-500">
            Введите запрос для поиска мероприятий
          </p>
        </div>
      )}
    </>
  );
}
