import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { EventGrid } from "@/components/events/EventGrid";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/JsonLd";
import { CitySocials } from "@/components/layout/CitySocials";
export const revalidate = 3600;

interface CityPageProps {
  params: Promise<{ city: string }>;
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

export default async function CityPage({ params }: CityPageProps) {
  const { city: citySlug } = await params;

  const city = await prisma.city.findUnique({
    where: { slug: citySlug },
    select: { id: true, name: true, namePrepositional: true },
  });

  if (!city) notFound();

  const events = await prisma.event.findMany({
    where: {
      cityId: city.id,
      isActive: true,
      isApproved: true,
      date: { gte: new Date() },
    },
    include: {
      category: { select: { slug: true, name: true, icon: true } },
    },
    orderBy: { date: "asc" },
    take: 48,
  });

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

      <h1 className="mb-6 text-2xl font-bold md:text-3xl">
        Куда сходить в {cityIn}
      </h1>

      <EventGrid events={events} citySlug={citySlug} />

      <CitySocials cityId={city.id} />
    </>
  );
}
