import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildPriceFilter, interleaveByCategory } from "@/lib/utils";
import { ITEMS_PER_PAGE } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const citySlug = searchParams.get("city");
  const categorySlug = searchParams.get("category");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || String(ITEMS_PER_PAGE), 10);
  const search = searchParams.get("q");

  const where: Record<string, unknown> = {
    isActive: true,
    isApproved: true,
    date: { gte: new Date() },
  };

  if (citySlug) {
    const city = await prisma.city.findUnique({
      where: { slug: citySlug },
      select: { id: true },
    });
    if (city) where.cityId = city.id;
  }

  if (categorySlug) {
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true },
    });
    if (category) where.categoryId = category.id;
  }

  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }

  // Extra filters
  const free = searchParams.get("free");
  const kids = searchParams.get("kids");
  const age = searchParams.get("age");
  const price = searchParams.get("price");
  const andConditions: unknown[] = [];

  if (free === "1") {
    where.isAvailable = true;
    andConditions.push({ OR: [{ price: { equals: 0 } }, { price: null }] });
  }
  if (kids === "1") where.isKids = true;
  if (age) where.age = parseInt(age);
  andConditions.push(...buildPriceFilter(price));
  if (andConditions.length > 0) where.AND = andConditions;

  // Sort order: paid+available first (by price desc), then free/unavailable
  // last. We fetch IDs via raw SQL (Prisma orderBy can't express CASE),
  // then hydrate with Prisma for the relations.
  const idsQuery = await fetchOrderedIds({
    where,
    skip: (page - 1) * limit,
    take: categorySlug ? limit : limit * 4,
  });
  const ids = idsQuery.ids;
  const total = idsQuery.total;

  if (ids.length === 0) {
    return NextResponse.json({
      events: [],
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  const rawEvents = await prisma.event.findMany({
    where: { id: { in: ids } },
    include: {
      category: { select: { slug: true, name: true, icon: true } },
      city: { select: { slug: true, name: true } },
    },
  });

  // Preserve the ordering from the raw query
  const byId = new Map(rawEvents.map((e) => [e.id, e]));
  const orderedEvents = ids.map((id) => byId.get(id)!).filter(Boolean);

  // When browsing all categories, interleave for variety
  const events = categorySlug
    ? orderedEvents
    : interleaveByCategory(orderedEvents).slice(0, limit);

  return NextResponse.json({
    events: events.map(serialize),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * Fetch event IDs in the correct "paid first, free last" order.
 * Uses raw SQL to express the CASE ordering (Prisma orderBy can't do it).
 */
async function fetchOrderedIds({
  where,
  skip,
  take,
}: {
  where: Record<string, unknown>;
  skip: number;
  take: number;
}): Promise<{ ids: number[]; total: number }> {
  // Count via Prisma (easy with the where clause)
  const total = await prisma.event.count({ where });

  // For the ordered SELECT we build a minimal raw SQL. We only need
  // conditions that match the where we've constructed here.
  const conditions: string[] = [
    `e."isActive" = true`,
    `e."isApproved" = true`,
    `e."date" >= NOW()`,
  ];

  if (where.cityId) conditions.push(`e."cityId" = ${Number(where.cityId)}`);
  if (where.categoryId) conditions.push(`e."categoryId" = ${Number(where.categoryId)}`);
  if (where.isKids === true) conditions.push(`e."isKids" = true`);
  if (typeof where.age === "number") conditions.push(`e."age" = ${where.age}`);
  if (where.isAvailable === true) conditions.push(`e."isAvailable" = true`);

  // Title search (safe-escaped)
  const title = (where.title as { contains?: string } | undefined)?.contains;
  if (title) {
    const safe = title.replace(/'/g, "''");
    conditions.push(`e."title" ILIKE '%${safe}%'`);
  }

  // AND array: price filters and free filter
  const andList = (where.AND as Array<Record<string, unknown>> | undefined) || [];
  for (const item of andList) {
    if (item.price && typeof item.price === "object") {
      const p = item.price as Record<string, unknown>;
      if (typeof p.gt === "number") conditions.push(`e."price" > ${p.gt}`);
      if (typeof p.lte === "number") conditions.push(`e."price" <= ${p.lte}`);
    }
    if (item.OR && Array.isArray(item.OR)) {
      // free filter: price = 0 OR price IS NULL
      const hasFree = item.OR.some((o: Record<string, unknown>) =>
        (o.price as { equals?: number } | undefined)?.equals === 0
      );
      if (hasFree) conditions.push(`(e."price" = 0 OR e."price" IS NULL)`);
    }
  }

  const whereSql = conditions.join(" AND ");
  const sql = `
    SELECT e."id"
    FROM "Event" e
    WHERE ${whereSql}
    ORDER BY
      (CASE WHEN e."isAvailable" = true AND e."price" IS NOT NULL AND e."price" > 0 THEN 0 ELSE 1 END),
      e."price" DESC NULLS LAST,
      e."date" ASC
    LIMIT ${take} OFFSET ${skip}
  `;

  const rows = await prisma.$queryRawUnsafe<Array<{ id: number }>>(sql);
  return { ids: rows.map((r) => r.id), total };
}

function serialize(e: Record<string, unknown> & { modifiedTime?: bigint | null; price?: unknown; priceMax?: unknown }) {
  return {
    ...e,
    modifiedTime: e.modifiedTime?.toString() ?? null,
    price: e.price ? Number(e.price) : null,
    priceMax: e.priceMax ? Number(e.priceMax) : null,
  };
}
