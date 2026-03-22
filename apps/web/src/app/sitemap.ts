export const dynamic = "force-dynamic";

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
  ];

  // City pages
  for (const city of cities) {
    entries.push({
      url: `${siteUrl}/${city.slug}`,
      changeFrequency: "daily",
      priority: 0.8,
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

  // Individual events (latest 1000)
  const events = await prisma.event.findMany({
    where: { isActive: true, isApproved: true, date: { gte: new Date() } },
    include: {
      city: { select: { slug: true } },
      category: { select: { slug: true } },
    },
    orderBy: { date: "asc" },
    take: 1000,
  });

  for (const event of events) {
    entries.push({
      url: `${siteUrl}/${event.city.slug}/${event.category.slug}/${event.slug}`,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
