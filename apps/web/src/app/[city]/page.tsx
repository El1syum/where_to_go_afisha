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
    select: { name: true, metaTitle: true, metaDescription: true, namePrepositional: true, id: true },
  });

  if (!city) return {};

  const cityIn = city.namePrepositional || city.name;
  const title = city.metaTitle || `Куда сходить в ${cityIn}`;
  const description = city.metaDescription ||
    `Все мероприятия в ${cityIn}. Концерты, театр, выставки, экскурсии, спорт. Расписание и покупка билетов онлайн.`;

  // OG image — first event with image
  const ogEvent = await prisma.event.findFirst({
    where: { cityId: city.id, isActive: true, isApproved: true, date: { gte: new Date() }, imageUrl: { not: null } },
    orderBy: { price: "desc" },
    select: { imageUrl: true },
  });

  return {
    title,
    description,
    alternates: { canonical: `/${citySlug}` },
    openGraph: {
      title,
      description,
      images: ogEvent?.imageUrl ? [ogEvent.imageUrl] : undefined,
    },
  };
}

export default async function CityPage({ params, searchParams }: CityPageProps) {
  const { city: citySlug } = await params;
  const { date: dateFilter, exact: exactDate, free, kids, age, price } = await searchParams;

  const city = await prisma.city.findUnique({
    where: { slug: citySlug },
    select: { id: true, name: true, namePrepositional: true, seoText: true },
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

  // Fetch top events per category (round-robin ready), then interleave.
  // Sort: paid+available first (by price DESC), then free/unavailable at the end.
  const perCategory = 6; // top N per category by price
  const topPerCategoryIds = await prisma.$queryRawUnsafe<Array<{ id: number }>>(`
    SELECT id FROM (
      SELECT e."id", e."categoryId",
        ROW_NUMBER() OVER (
          PARTITION BY e."categoryId"
          ORDER BY
            (CASE WHEN e."isAvailable" = true AND e."price" IS NOT NULL AND e."price" > 0 THEN 0 ELSE 1 END),
            e."price" DESC NULLS LAST,
            e."date" ASC
        ) as rn
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

  // Interleave: paid+available first, then free/unavailable at the end.
  const isPaid = (e: EventWithCategory) =>
    e.isAvailable && e.price != null && Number(e.price) > 0;
  const priceScore = (e: EventWithCategory) =>
    isPaid(e) ? Number(e.price) : -1;

  const groups = new Map<string, EventWithCategory[]>();
  for (const e of rawEvents) {
    const key = e.category.slug;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) => {
      // Paid before free within a category
      const pa = isPaid(a) ? 0 : 1;
      const pb = isPaid(b) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      const sa = priceScore(a);
      const sb = priceScore(b);
      if (sa !== sb) return sb - sa;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }
  const events: EventWithCategory[] = [];
  let lastSlug = "";
  while (events.length < 24) {
    // Prefer paid heads first (any category). Only fall back to free when
    // no paid events remain in any queue.
    let bestQueue: EventWithCategory[] | null = null;
    let bestScore = -Infinity;
    let anyPaid = false;
    for (const q of groups.values()) {
      if (q.length === 0) continue;
      if (isPaid(q[0])) anyPaid = true;
    }
    for (const q of groups.values()) {
      if (q.length === 0) continue;
      if (q[0].category.slug === lastSlug) continue;
      if (anyPaid && !isPaid(q[0])) continue;
      const s = priceScore(q[0]);
      if (s > bestScore) { bestScore = s; bestQueue = q; }
    }
    // Fallback: all remaining heads are same category — pick anyway (respecting paid-first)
    if (!bestQueue) {
      for (const q of groups.values()) {
        if (q.length === 0) continue;
        if (anyPaid && !isPaid(q[0])) continue;
        bestQueue = q;
        break;
      }
    }
    if (!bestQueue) break;
    const item = bestQueue.shift()!;
    events.push(item);
    lastSlug = item.category.slug;
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

      <h2 className="mb-4 text-2xl font-bold text-gray-900">Все афиши</h2>
      <EventGrid events={events} citySlug={citySlug} total={total} />

      {city.seoText && (
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Куда сходить в {cityIn}</h2>
          <div className="prose prose-sm max-w-none text-gray-600">
            {city.seoText.split("\n").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      )}

      <CitySocials cityId={city.id} />

      <OtherCities currentSlug={citySlug} />
    </>
  );
}

async function OtherCities({ currentSlug }: { currentSlug: string }) {
  const cities = await prisma.city.findMany({
    where: { isActive: true, slug: { not: currentSlug } },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
    take: 15,
  });

  if (cities.length === 0) return null;

  return (
    <div className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Другие города</h2>
      <div className="flex flex-wrap gap-2">
        {cities.map((c) => (
          <a
            key={c.slug}
            href={`/${c.slug}`}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-indigo-300 hover:text-indigo-600"
          >
            {c.name}
          </a>
        ))}
      </div>
    </div>
  );
}
