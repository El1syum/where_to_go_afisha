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

  // When filtering by specific category, no need to interleave
  if (categorySlug) {
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          category: { select: { slug: true, name: true, icon: true } },
          city: { select: { slug: true, name: true } },
        },
        orderBy: [{ price: "desc" }, { date: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({
      events: events.map(serialize),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  // For all-categories view: fetch more, interleave, slice
  const [rawEvents, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        category: { select: { slug: true, name: true, icon: true } },
        city: { select: { slug: true, name: true } },
      },
      orderBy: [{ price: "desc" }, { date: "asc" }],
      skip: (page - 1) * limit,
      take: limit * 4,
    }),
    prisma.event.count({ where }),
  ]);

  const events = interleaveByCategory(rawEvents).slice(0, limit);

  return NextResponse.json({
    events: events.map(serialize),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

function serialize(e: Record<string, unknown> & { modifiedTime?: bigint | null; price?: unknown; priceMax?: unknown }) {
  return {
    ...e,
    modifiedTime: e.modifiedTime?.toString() ?? null,
    price: e.price ? Number(e.price) : null,
    priceMax: e.priceMax ? Number(e.priceMax) : null,
  };
}
