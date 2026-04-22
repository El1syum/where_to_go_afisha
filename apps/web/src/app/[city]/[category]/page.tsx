import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildDateFilter, buildPriceFilter } from "@/lib/utils";
import { EventGrid } from "@/components/events/EventGrid";
import { DateFilter } from "@/components/filters/DateFilter";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/JsonLd";
export const revalidate = 3600;

interface CategoryPageProps {
  params: Promise<{ city: string; category: string }>;
  searchParams: Promise<{ date?: string; exact?: string; free?: string; kids?: string; age?: string; price?: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { city: citySlug, category: categorySlug } = await params;

  const isKidsView = categorySlug === "kids";

  const [city, category] = await Promise.all([
    prisma.city.findUnique({
      where: { slug: citySlug },
      select: { id: true, name: true, namePrepositional: true },
    }),
    isKidsView
      ? Promise.resolve({ id: 0, name: "Детям" })
      : prisma.category.findUnique({
          where: { slug: categorySlug },
          select: { id: true, name: true },
        }),
  ]);

  if (!city || !category) return {};

  const cityIn = city.namePrepositional || city.name;
  const title = `${category.name} в ${cityIn} — расписание, билеты`;
  const description = `${category.name} в ${cityIn}. Расписание, билеты онлайн. Все мероприятия на одном сайте.`;

  const ogWhere: Record<string, unknown> = {
    cityId: city.id,
    isActive: true,
    isApproved: true,
    date: { gte: new Date() },
    imageUrl: { not: null },
  };
  if (isKidsView) ogWhere.isKids = true;
  else ogWhere.categoryId = category.id;

  const ogEvent = await prisma.event.findFirst({
    where: ogWhere,
    orderBy: { price: "desc" },
    select: { imageUrl: true },
  });

  return {
    title,
    description,
    alternates: { canonical: `/${citySlug}/${categorySlug}` },
    openGraph: { title, description, images: ogEvent?.imageUrl ? [ogEvent.imageUrl] : undefined },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { city: citySlug, category: categorySlug } = await params;
  const { date: dateFilter, exact: exactDate, free, kids, age, price } = await searchParams;

  // "kids" is a virtual category: shows all isKids=true events regardless of categoryId
  const isKidsView = categorySlug === "kids";

  const [city, category] = await Promise.all([
    prisma.city.findUnique({
      where: { slug: citySlug },
      select: { id: true, name: true, namePrepositional: true },
    }),
    isKidsView
      ? Promise.resolve({ id: 0, name: "Детям", slug: "kids", icon: "🧸" })
      : prisma.category.findUnique({
          where: { slug: categorySlug },
          select: { id: true, name: true, slug: true, icon: true },
        }),
  ]);

  if (!city || !category) notFound();

  const dateRange = buildDateFilter(dateFilter, exactDate);

  const where: Record<string, unknown> = {
    cityId: city.id,
    isActive: true,
    isApproved: true,
    date: dateRange || { gte: new Date() },
  };
  if (isKidsView) {
    where.isKids = true;
  } else {
    where.categoryId = category.id;
  }
  const andConditions: unknown[] = [];
  if (free === "1") {
    where.isAvailable = true;
    andConditions.push({ OR: [{ price: { equals: 0 } }, { price: null }] });
  }
  if (kids === "1") where.isKids = true;
  if (age) where.age = parseInt(age);
  andConditions.push(...buildPriceFilter(price));
  if (andConditions.length > 0) where.AND = andConditions;

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        category: { select: { slug: true, name: true, icon: true } },
      },
      orderBy: { date: "asc" },
      take: 24,
    }),
    prisma.event.count({ where }),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const cityIn = city.namePrepositional || city.name;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Главная", url: siteUrl },
          { name: city.name, url: `${siteUrl}/${citySlug}` },
          { name: category.name, url: `${siteUrl}/${citySlug}/${categorySlug}` },
        ])}
      />

      <h1 className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl">
        {category.name} в {cityIn}
      </h1>

      <Suspense fallback={<div className="mb-6 h-10" />}>
        <DateFilter />
      </Suspense>

      <EventGrid events={events} citySlug={citySlug} categorySlug={categorySlug} total={total} />
    </>
  );
}
