export const dynamic = "force-dynamic";

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kudaafisha.ru";

  const cities = await prisma.city.findMany({
    where: { isActive: true },
    select: { slug: true },
  });

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { slug: true },
  });

  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1.0 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/contacts`, changeFrequency: "monthly", priority: 0.3 },
  ];

  // City pages
  for (const city of cities) {
    entries.push({
      url: `${siteUrl}/${city.slug}`,
      changeFrequency: "daily",
      priority: 0.9,
    });

    // Category pages per city
    for (const cat of categories) {
      entries.push({
        url: `${siteUrl}/${city.slug}/${cat.slug}`,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  }

  // Individual events — all active future events
  const events = await prisma.event.findMany({
    where: { isActive: true, isApproved: true, date: { gte: new Date() } },
    select: {
      slug: true,
      updatedAt: true,
      city: { select: { slug: true } },
      category: { select: { slug: true } },
    },
    orderBy: { date: "asc" },
  });

  for (const event of events) {
    entries.push({
      url: `${siteUrl}/${event.city.slug}/${event.category.slug}/${event.slug}`,
      lastModified: event.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
