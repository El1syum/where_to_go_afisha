import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDateTime, formatDate, formatPrice } from "@/lib/utils";
import { JsonLd, eventJsonLd, breadcrumbJsonLd } from "@/components/seo/JsonLd";
import { AdInContent } from "@/components/ads/AdInContent";
import { ShareButtons } from "@/components/events/ShareButtons";
import { EventCard } from "@/components/events/EventCard";
export const revalidate = 3600;

interface EventPageProps {
  params: Promise<{ city: string; category: string; slug: string }>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { city: citySlug, slug } = await params;

  const event = await prisma.event.findFirst({
    where: { slug },
    include: {
      city: { select: { name: true, namePrepositional: true } },
      category: { select: { name: true } },
    },
  });

  if (!event) return {};

  const dateStr = event.date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    title: `${event.title} — ${dateStr} | ${event.city.name}`,
    description: event.description?.substring(0, 160) || `${event.title} в ${event.city.namePrepositional || event.city.name}. Купить билеты онлайн.`,
    openGraph: {
      title: event.title,
      description: event.description?.substring(0, 200) || undefined,
      images: event.imageUrl ? [event.imageUrl] : undefined,
    },
    alternates: {
      canonical: `/${citySlug}/${event.category.name}/${slug}`,
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { city: citySlug, category: categorySlug, slug } = await params;

  const event = await prisma.event.findFirst({
    where: { slug },
    include: {
      city: { select: { id: true, name: true, namePrepositional: true } },
      category: { select: { id: true, slug: true, name: true, icon: true } },
    },
  });

  if (!event) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const eventUrl = `${siteUrl}/${citySlug}/${categorySlug}/${slug}`;

  // Похожие мероприятия (та же категория, тот же город, ближайшие по дате)
  const similarEvents = await prisma.event.findMany({
    where: {
      cityId: event.city.id,
      categoryId: event.category.id,
      isActive: true,
      isApproved: true,
      date: { gte: new Date() },
      id: { not: event.id },
    },
    include: {
      category: { select: { slug: true, name: true, icon: true } },
    },
    orderBy: { date: "asc" },
    take: 4,
  });

  // Другие мероприятия в этом месте
  const samePlace = event.place
    ? await prisma.event.findMany({
        where: {
          place: event.place,
          cityId: event.city.id,
          isActive: true,
          isApproved: true,
          date: { gte: new Date() },
          id: { not: event.id },
          categoryId: { not: event.category.id },
        },
        include: {
          category: { select: { slug: true, name: true, icon: true } },
        },
        orderBy: { date: "asc" },
        take: 4,
      })
    : [];

  return (
    <>
      <JsonLd data={eventJsonLd({
        title: event.title,
        description: event.description,
        date: event.date,
        place: event.place,
        price: event.price ? Number(event.price) : null,
        imageUrl: event.imageUrl,
        affiliateUrl: event.affiliateUrl,
        cityName: event.city.name,
      })} />
      <JsonLd data={breadcrumbJsonLd([
        { name: "Главная", url: siteUrl },
        { name: event.city.name, url: `${siteUrl}/${citySlug}` },
        { name: event.category.name, url: `${siteUrl}/${citySlug}/${categorySlug}` },
        { name: event.title, url: eventUrl },
      ])} />

      {/* Breadcrumbs */}
      <nav className="mb-4 text-sm text-muted-foreground">
        <a href={`/${citySlug}`} className="hover:text-primary">{event.city.name}</a>
        {" / "}
        <a href={`/${citySlug}/${categorySlug}`} className="hover:text-primary">{event.category.name}</a>
        {" / "}
        <span className="text-foreground">{event.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          {event.imageUrl && (
            <div className="relative z-0 mb-6 aspect-[16/9] overflow-hidden rounded-xl">
              <Image
                src={event.imageUrl}
                alt={event.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 66vw"
                priority
              />
            </div>
          )}

          <h1 className="mb-4 text-2xl font-bold md:text-3xl">{event.title}</h1>

          {event.description && (
            <div className="prose max-w-none text-foreground">
              {event.description.split("\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}

          <AdInContent />

          {/* Поделиться */}
          <ShareButtons title={event.title} url={eventUrl} />

          {/* Яндекс.Карта */}
          {event.place && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">На карте</h2>
              <div className="overflow-hidden rounded-xl border border-border">
                <iframe
                  src={`https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(event.place + ", " + event.city.name)}&z=16&l=map&pt=${encodeURIComponent(event.place + ", " + event.city.name)}~pm2rdm`}
                  width="100%"
                  height="300"
                  frameBorder="0"
                  allowFullScreen
                  loading="lazy"
                  className="block"
                />
              </div>
              <a
                href={`https://yandex.ru/maps/?text=${encodeURIComponent(event.place + ", " + event.city.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Открыть в Яндекс.Картах →
              </a>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 rounded-xl border border-border bg-card p-6">
            <div className="mb-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-lg">📅</span>
                <div>
                  <div className="text-sm text-muted-foreground">Дата</div>
                  <div className="font-medium">{formatDateTime(event.date)}</div>
                </div>
              </div>

              {event.place && (
                <div className="flex items-start gap-3">
                  <span className="text-lg">📍</span>
                  <div>
                    <div className="text-sm text-muted-foreground">Место</div>
                    <div className="font-medium">{event.place}</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <span className="text-lg">💰</span>
                <div>
                  <div className="text-sm text-muted-foreground">Цена</div>
                  <div className="font-medium">{formatPrice(event.price ? Number(event.price) : null)}</div>
                </div>
              </div>

              <div className="flex gap-2">
                {event.age != null && (
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{event.age}+</span>
                )}
                {event.isKids && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">Детское</span>
                )}
                {event.isPremiere && (
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">Премьера</span>
                )}
              </div>
            </div>

            {event.affiliateUrl && (
              <a
                href={event.affiliateUrl}
                target="_blank"
                rel="nofollow sponsored noopener"
                className="mt-4 block w-full rounded-lg bg-primary py-3 text-center font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Купить билет
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Другие мероприятия в этом месте */}
      {samePlace.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-xl font-bold">Другие мероприятия — {event.place}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {samePlace.map((e) => (
              <EventCard key={e.slug} event={e} citySlug={citySlug} />
            ))}
          </div>
        </div>
      )}

      {/* Похожие мероприятия */}
      {similarEvents.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-xl font-bold">Похожие мероприятия</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {similarEvents.map((e) => (
              <EventCard key={e.slug} event={e} citySlug={citySlug} />
            ))}
          </div>
        </div>
      )}

      {/* Mobile sticky buy button */}
      {event.affiliateUrl && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
          <a
            href={event.affiliateUrl}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="block w-full rounded-lg bg-primary py-3 text-center font-semibold text-primary-foreground"
          >
            Купить билет — {formatPrice(event.price ? Number(event.price) : null)}
          </a>
        </div>
      )}
    </>
  );
}
