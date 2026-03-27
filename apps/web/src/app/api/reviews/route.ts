import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  const reviews = await prisma.review.findMany({
    where: {
      eventId: parseInt(eventId, 10),
      isApproved: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reviews });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { author, rating, text, eventId } = body;

    if (!author || !rating || !text || !eventId) {
      return NextResponse.json(
        { error: "author, rating, text, eventId are required" },
        { status: 400 },
      );
    }

    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json(
        { error: "rating must be between 1 and 5" },
        { status: 400 },
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId, 10) },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const review = await prisma.review.create({
      data: {
        author: String(author).trim(),
        rating: ratingNum,
        text: String(text).trim(),
        eventId: event.id,
        isApproved: false,
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
