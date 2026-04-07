import { prisma } from "../shared/db.js";
import { logger } from "../shared/logger.js";
import type { TransformedEvent } from "../xml-importer/transformer.js";

const cityCache = new Map<string, number>();
const categoryCache = new Map<string, number>();

export function resetCaches() {
  cityCache.clear();
  categoryCache.clear();
}

async function getOrCreateCityId(slug: string, cityName?: string): Promise<number> {
  const cached = cityCache.get(slug);
  if (cached) return cached;

  const hasRussian = !!(cityName && /[а-яА-ЯёЁ]/.test(cityName));
  const displayName = hasRussian ? cityName! : slug;

  let city = await prisma.city.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });

  if (!city) {
    city = await prisma.city.create({
      data: { slug, name: displayName, isActive: false },
      select: { id: true, name: true },
    });
  } else if (hasRussian && city.name === slug) {
    await prisma.city.update({
      where: { id: city.id },
      data: { name: displayName },
    });
  }

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

// Pre-warm city and category caches — bulk load from DB, create missing
async function warmCaches(events: TransformedEvent[]) {
  // Map slug → first-seen Russian cityName (for backfilling and creation)
  const slugToName = new Map<string, string | undefined>();
  for (const e of events) {
    if (!slugToName.has(e.citySlug)) slugToName.set(e.citySlug, e.cityName);
  }

  const citySlugs = [...slugToName.keys()].filter((s) => !cityCache.has(s));
  const catSourceIds = [...new Set(events.map((e) => e.categorySourceId))].filter((s) => !categoryCache.has(s));

  // Bulk load existing cities
  if (citySlugs.length > 0) {
    const cities = await prisma.city.findMany({
      where: { slug: { in: citySlugs } },
      select: { id: true, slug: true, name: true },
    });

    // Backfill Russian names for cities that still have slug-as-name
    for (const c of cities) {
      cityCache.set(c.slug, c.id);
      const cityName = slugToName.get(c.slug);
      if (cityName && /[а-яА-ЯёЁ]/.test(cityName) && c.name === c.slug) {
        await prisma.city.update({ where: { id: c.id }, data: { name: cityName } }).catch(() => {});
      }
    }

    // Create missing cities one by one
    for (const slug of citySlugs) {
      if (!cityCache.has(slug)) {
        try {
          await getOrCreateCityId(slug, slugToName.get(slug));
        } catch { /* skip */ }
      }
    }
  }

  // Bulk load categories
  if (catSourceIds.length > 0) {
    const cats = await prisma.category.findMany({
      where: { sourceId: { in: catSourceIds } },
      select: { id: true, sourceId: true },
    });
    for (const c of cats) {
      if (c.sourceId) categoryCache.set(c.sourceId, c.id);
    }

    for (const sid of catSourceIds) {
      if (!categoryCache.has(sid)) await getCategoryId(sid);
    }
  }
}

interface UpsertResult {
  newCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: Array<{ externalId: string; error: string }>;
}

export async function upsertBatch(events: TransformedEvent[]): Promise<UpsertResult> {
  const result: UpsertResult = {
    newCount: 0, updatedCount: 0, skippedCount: 0, errorCount: 0, errors: [],
  };

  if (events.length === 0) return result;

  await warmCaches(events);

  // Find all existing in one query
  const externalIds = events.map((e) => e.externalId);
  const existing = await prisma.event.findMany({
    where: {
      externalId: { in: externalIds },
      source: "ADVCAKE",
    },
    select: { id: true, externalId: true },
  });
  const existingMap = new Map(existing.map((e) => [e.externalId, e.id]));

  // Split into new and existing
  const toCreate: typeof events = [];
  const toUpdate: Array<{ dbId: number; event: TransformedEvent }> = [];

  for (const event of events) {
    const dbId = existingMap.get(event.externalId);
    if (dbId) {
      toUpdate.push({ dbId, event });
    } else {
      toCreate.push(event);
    }
  }

  // Batch create new events (skip duplicates)
  if (toCreate.length > 0) {
    try {
      const data = await Promise.all(toCreate.map(async (event) => ({
        externalId: event.externalId,
        source: "ADVCAKE" as const,
        slug: event.slug,
        title: event.title,
        description: event.description,
        date: event.date,
        place: event.place,
        price: event.price,
        imageUrl: event.imageUrl,
        affiliateUrl: event.affiliateUrl,
        age: event.age,
        isKids: event.isKids,
        isAvailable: event.isAvailable,
        cityId: cityCache.get(event.citySlug)!,
        categoryId: categoryCache.get(event.categorySourceId)!,
      })));

      const created = await prisma.event.createMany({
        data,
        skipDuplicates: true,
      });
      result.newCount += created.count;
    } catch (err) {
      // Fallback: create one by one
      for (const event of toCreate) {
        try {
          await prisma.event.create({
            data: {
              externalId: event.externalId, source: "ADVCAKE",
              slug: event.slug, title: event.title, description: event.description,
              date: event.date, place: event.place, price: event.price,
              imageUrl: event.imageUrl, affiliateUrl: event.affiliateUrl,
              age: event.age, isKids: event.isKids, isAvailable: event.isAvailable,
              cityId: cityCache.get(event.citySlug)!,
              categoryId: categoryCache.get(event.categorySourceId)!,
            },
          });
          result.newCount++;
        } catch (e) {
          result.errorCount++;
          result.errors.push({
            externalId: event.externalId,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }
  }

  // Update existing events (batch via transaction)
  if (toUpdate.length > 0) {
    const updates = toUpdate.map(({ dbId, event }) =>
      prisma.event.update({
        where: { id: dbId },
        data: {
          slug: event.slug, title: event.title, description: event.description,
          date: event.date, place: event.place, price: event.price,
          imageUrl: event.imageUrl, affiliateUrl: event.affiliateUrl,
          age: event.age, isKids: event.isKids, isAvailable: event.isAvailable,
          cityId: cityCache.get(event.citySlug)!, categoryId: categoryCache.get(event.categorySourceId)!,
          isActive: true,
        },
      })
    );

    try {
      await prisma.$transaction(updates);
      result.updatedCount += toUpdate.length;
    } catch {
      // Fallback: one by one
      for (const { dbId, event } of toUpdate) {
        try {
          await prisma.event.update({
            where: { id: dbId },
            data: {
              slug: event.slug, title: event.title, description: event.description,
              date: event.date, place: event.place, price: event.price,
              imageUrl: event.imageUrl, affiliateUrl: event.affiliateUrl,
              age: event.age, isKids: event.isKids, isAvailable: event.isAvailable,
              cityId: cityCache.get(event.citySlug)!, categoryId: categoryCache.get(event.categorySourceId)!,
              isActive: true,
            },
          });
          result.updatedCount++;
        } catch (e) {
          result.errorCount++;
          result.errors.push({ externalId: event.externalId, error: e instanceof Error ? e.message : String(e) });
        }
      }
    }
  }

  return result;
}
