import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildDateFilter } from "@/lib/utils";
import { EventGrid } from "@/components/events/EventGrid";
import { DateFilter } from "@/components/filters/DateFilter";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/JsonLd";
export const revalidate = 3600;

interface CategoryPageProps {
  params: Promise<{ city: string; category: string }>;
  searchParams: Promise<{ date?: string; exact?: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { city: citySlug, category: categorySlug } = await params;

  const [city, category] = await Promise.all([
    prisma.city.findUnique({
      where: { slug: citySlug },
      select: { name: true, namePrepositional: true },
    }),
    prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { name: true },
    }),
  ]);

  if (!city || !category) return {};

  const cityIn = city.namePrepositional || city.name;

  return {
    title: `${category.name} в ${cityIn} — расписание, билеты`,
    description: `${category.name} в ${cityIn}. Расписание, билеты онлайн. Все мероприятия на одном сайте.`,
    alternates: {
      canonical: `/${citySlug}/${categorySlug}`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { city: citySlug, category: categorySlug } = await params;
  const { date: dateFilter, exact: exactDate } = await searchParams;

  const [city, category] = await Promise.all([
    prisma.city.findUnique({
      where: { slug: citySlug },
      select: { id: true, name: true, namePrepositional: true },
    }),
    prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true, name: true, slug: true, icon: true },
    }),
  ]);

  if (!city || !category) notFound();

  const dateRange = buildDateFilter(dateFilter, exactDate);

  const where = {
    cityId: city.id,
    categoryId: category.id,
    isActive: true,
    isApproved: true,
    date: dateRange || { gte: new Date() },
  };

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

      <h1 className="mb-6 text-2xl font-bold md:text-3xl">
        {category.name} в {cityIn}
      </h1>

      <Suspense fallback={<div className="mb-6 h-10" />}>
        <DateFilter />
      </Suspense>

      <EventGrid events={events} citySlug={citySlug} categorySlug={categorySlug} total={total} />
    </>
  );
}
