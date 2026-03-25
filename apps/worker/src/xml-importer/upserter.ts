import { prisma } from "../shared/db.js";
import { logger } from "../shared/logger.js";
import type { TransformedEvent } from "./transformer.js";

// In-memory caches for city and category lookups (populated per import run)
const cityCache = new Map<string, number>(); // slug -> id
const categoryCache = new Map<string, number>(); // sourceId -> id

export function resetCaches() {
  cityCache.clear();
  categoryCache.clear();
}

async function getOrCreateCityId(slug: string): Promise<number> {
  const cached = cityCache.get(slug);
  if (cached) return cached;

  const city = await prisma.city.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      name: slug, // Will be updated manually or via seed
      isActive: false, // New cities need manual activation
    },
    select: { id: true },
  });

  cityCache.set(slug, city.id);
  return city.id;
}

async function getCategoryId(sourceId: string): Promise<number> {
  const cached = categoryCache.get(sourceId);
  if (cached) return cached;

  const category = await prisma.category.findFirst({
    where: { sourceId },
    select: { id: true },
  });

  if (!category) {
    // Fallback to "events" category (sourceId: "10")
    const fallback = await prisma.category.findFirst({
      where: { sourceId: "10" },
      select: { id: true },
    });
    const id = fallback?.id ?? 1;
    categoryCache.set(sourceId, id);
    return id;
  }

  categoryCache.set(sourceId, category.id);
  return category.id;
}

interface UpsertResult {
  newCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: Array<{ externalId: string; error: string }>;
}

export async function upsertBatch(
  events: TransformedEvent[]
): Promise<UpsertResult> {
  const result: UpsertResult = {
    newCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    errors: [],
  };

  for (const event of events) {
    try {
      const cityId = await getOrCreateCityId(event.citySlug);
      const categoryId = await getCategoryId(event.categorySourceId);

      const existing = await prisma.event.findUnique({
        where: {
          externalId_source: {
            externalId: event.externalId,
            source: "YANDEX_XML",
          },
        },
        select: { id: true, modifiedTime: true },
      });

      if (existing) {
        // Skip if not modified
        if (
          event.modifiedTime &&
          existing.modifiedTime &&
          event.modifiedTime === existing.modifiedTime
        ) {
          result.skippedCount++;
          continue;
        }

        await prisma.event.update({
          where: { id: existing.id },
          data: {
            slug: event.slug,
            title: event.title,
            description: event.description,
            date: event.date,
            place: event.place,
            price: event.price,
            imageUrl: event.imageUrl,
            affiliateUrl: event.affiliateUrl,
            originalUrl: event.originalUrl,
            age: event.age,
            isKids: event.isKids,
            isPremiere: event.isPremiere,
            isAvailable: event.isAvailable,
            modifiedTime: event.modifiedTime,
            cityId,
            categoryId,
          },
        });
        result.updatedCount++;
      } else {
        await prisma.event.create({
          data: {
            externalId: event.externalId,
            source: "YANDEX_XML",
            slug: event.slug,
            title: event.title,
            description: event.description,
            date: event.date,
            place: event.place,
            price: event.price,
            imageUrl: event.imageUrl,
            affiliateUrl: event.affiliateUrl,
            originalUrl: event.originalUrl,
            age: event.age,
            isKids: event.isKids,
            isPremiere: event.isPremiere,
            modifiedTime: event.modifiedTime,
            cityId,
            categoryId,
          },
        });
        result.newCount++;
      }
    } catch (err) {
      result.errorCount++;
      result.errors.push({
        externalId: event.externalId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
