import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildDateFilter, buildPriceFilter } from "@/lib/utils";
import { EventGrid } from "@/components/events/EventGrid";
import { DateFilter } from "@/components/filters/DateFilter";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/JsonLd";
import { CitySocials } from "@/components/layout/CitySocials";
import { Collections } from "@/components/events/Collections";
import { HeroBanner } from "@/components/layout/HeroBanner";
export const revalidate = 3600;

interface CityPageProps {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ date?: string; exact?: string; free?: string; kids?: string; age?: string; price?: string }>;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = await prisma.city.findUnique({
    where: { slug: citySlug },
    select: { name: true, metaTitle: true, metaDescription: true, namePrepositional: true },
  });

  if (!city) return {};

  const cityIn = city.namePrepositional || city.name;

  return {
    title: city.metaTitle || `Куда сходить в ${cityIn}`,
    description:
      city.metaDescription ||
      `Все мероприятия в ${cityIn}. Концерты, театр, выставки, экскурсии, спорт. Расписание и покупка билетов онлайн.`,
    alternates: {
      canonical: `/${citySlug}`,
    },
  };
}

export default async function CityPage({ params, searchParams }: CityPageProps) {
  const { city: citySlug } = await params;
  const { date: dateFilter, exact: exactDate, free, kids, age, price } = await searchParams;

  const city = await prisma.city.findUnique({
    where: { slug: citySlug },
    select: { id: true, name: true, namePrepositional: true },
  });

  if (!city) notFound();

  const dateRange = buildDateFilter(dateFilter, exactDate);

  const where: Record<string, unknown> = {
    cityId: city.id,
    isActive: true,
    isApproved: true,
    date: dateRange || { gte: new Date() },
  };
  const andConditions: unknown[] = [];
  if (free === "1") {
    where.isAvailable = true;
    andConditions.push({ OR: [{ price: { equals: 0 } }, { price: null }] });
  }
  if (kids === "1") where.isKids = true;
  if (age) where.age = parseInt(age);
  andConditions.push(...buildPriceFilter(price));
  if (andConditions.length > 0) where.AND = andConditions;

  // Fetch top events per category (round-robin ready), then interleave
  const perCategory = 6; // top N per category by price
  const topPerCategoryIds = await prisma.$queryRawUnsafe<Array<{ id: number }>>(`
    SELECT id FROM (
      SELECT e."id", e."categoryId",
        ROW_NUMBER() OVER (PARTITION BY e."categoryId" ORDER BY e."price" DESC NULLS LAST, e."date" ASC) as rn
      FROM "Event" e
      WHERE e."cityId" = $1
        AND e."isActive" = true AND e."isApproved" = true
        AND e."date" > $2
        ${free === "1" ? `AND e."isAvailable" = true AND (e."price" = 0 OR e."price" IS NULL)` : ""}
        ${kids === "1" ? `AND e."isKids" = true` : ""}
        ${age ? `AND e."age" = ${parseInt(age)}` : ""}
        ${price === "0-1000" ? `AND e."price" > 0 AND e."price" <= 1000` : ""}
        ${price === "1000-2000" ? `AND e."price" > 1000 AND e."price" <= 2000` : ""}
        ${price === "2000-4000" ? `AND e."price" > 2000 AND e."price" <= 4000` : ""}
        ${price === "4000+" ? `AND e."price" > 4000` : ""}
    ) ranked WHERE rn <= $3
  `, city.id, dateRange?.gte || new Date(), perCategory);

  const rawEvents = topPerCategoryIds.length > 0
    ? await prisma.event.findMany({
        where: { id: { in: topPerCategoryIds.map((r) => r.id) } },
        include: { category: { select: { slug: true, name: true, icon: true } } },
      })
    : [];
  const total = await prisma.event.count({ where });

  type EventWithCategory = (typeof rawEvents)[number];

  // Interleave: round-robin by category, expensive first within each
  const groups = new Map<string, EventWithCategory[]>();
  for (const e of rawEvents) {
    const key = e.category.slug;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) => {
      const pa = Number(a.price) || 0;
      const pb = Number(b.price) || 0;
      return pb !== pa ? pb - pa : new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }
  const queues = [...groups.values()].sort((a, b) => b.length - a.length);
  const events: EventWithCategory[] = [];
  let lastSlug = "";
  while (events.length < 24 && queues.some((q) => q.length > 0)) {
    let picked = false;
    for (const q of queues) {
      if (q.length > 0 && q[0].category.slug !== lastSlug) {
        const item = q.shift()!;
        events.push(item);
        lastSlug = item.category.slug;
        picked = true;
        break;
      }
    }
    if (!picked) {
      for (const q of queues) {
        if (q.length > 0) {
          const item = q.shift()!;
          events.push(item);
          lastSlug = item.category.slug;
          break;
        }
      }
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const cityIn = city.namePrepositional || city.name;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Главная", url: siteUrl },
          { name: city.name, url: `${siteUrl}/${citySlug}` },
        ])}
      />

      <HeroBanner citySlug={citySlug} />

      <h1 className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl">
        Куда сходить в {cityIn}
      </h1>

      <Suspense fallback={<div className="mb-6 h-10" />}>
        <DateFilter />
      </Suspense>

      <Suspense fallback={null}>
        <Collections cityId={city.id} citySlug={citySlug} />
      </Suspense>

      <EventGrid events={events} citySlug={citySlug} total={total} />

      <CitySocials cityId={city.id} />
    </>
  );
}
