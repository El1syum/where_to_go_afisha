import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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
  const andConditions: unknown[] = [];

  if (free === "1") {
    where.isAvailable = true;
    andConditions.push({ OR: [{ price: { equals: 0 } }, { price: null }] });
  }
  if (kids === "1") where.isKids = true;
  if (age) where.age = parseInt(age);
  if (andConditions.length > 0) where.AND = andConditions;

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        category: { select: { slug: true, name: true, icon: true } },
        city: { select: { slug: true, name: true } },
      },
      orderBy: { date: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.event.count({ where }),
  ]);

  // Convert BigInt fields to string for JSON serialization
  const safeEvents = events.map((e) => ({
    ...e,
    modifiedTime: e.modifiedTime?.toString() ?? null,
    price: e.price ? Number(e.price) : null,
    priceMax: e.priceMax ? Number(e.priceMax) : null,
  }));

  return NextResponse.json({
    events: safeEvents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
