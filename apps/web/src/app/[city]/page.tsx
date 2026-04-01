import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildDateFilter, buildPriceFilter, interleaveByCategory } from "@/lib/utils";
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

  const [rawEvents, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        category: { select: { slug: true, name: true, icon: true } },
      },
      orderBy: [{ price: "desc" }, { date: "asc" }],
      take: 48,
    }),
    prisma.event.count({ where }),
  ]);
  const events = interleaveByCategory(rawEvents).slice(0, 24);

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
