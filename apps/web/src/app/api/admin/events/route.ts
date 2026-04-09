import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  if (!body.title || !body.date || !body.cityId || !body.categoryId) {
    return NextResponse.json({ error: "Название, дата, город и категория обязательны" }, { status: 400 });
  }

  const slug = slugify(body.title) + "-manual-" + Date.now();

  const event = await prisma.event.create({
    data: {
      externalId: `manual-${Date.now()}`,
      source: "MANUAL",
      slug,
      title: body.title,
      description: body.description || null,
      date: new Date(body.date),
      place: body.place || null,
      price: body.price != null ? body.price : null,
      imageUrl: body.imageUrl || null,
      affiliateUrl: body.affiliateUrl || null,
      age: body.age,
      isKids: body.isKids || false,
      isPremiere: body.isPremiere || false,
      isActive: true,
      isApproved: true,
      isAvailable: true,
      cityId: body.cityId,
      categoryId: body.categoryId,
    },
    include: {
      city: { select: { slug: true } },
      category: { select: { slug: true } },
    },
  });

  // Optionally create a city-scoped banner pointing to this event
  let banner = null;
  if (body.createBanner && event.imageUrl) {
    const dateStr = new Date(event.date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      timeZone: "Europe/Moscow",
    });
    const subtitle = event.place ? `${dateStr} · ${event.place}` : dateStr;
    const linkUrl = `/${event.city.slug}/${event.category.slug}/${event.slug}`;

    const agg = await prisma.banner.aggregate({ _max: { sortOrder: true } });
    const nextOrder = (agg._max.sortOrder ?? 0) + 10;

    banner = await prisma.banner.create({
      data: {
        title: event.title,
        subtitle,
        imageUrl: event.imageUrl,
        linkUrl,
        cityId: event.cityId,
        sortOrder: nextOrder,
        isActive: true,
      },
    });
  }

  return NextResponse.json({ event, banner, ok: true });
}
