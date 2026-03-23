import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId, channelId } = await request.json();

  // Create a pending post — worker will pick it up, or we mark as manual
  const post = await prisma.telegramPost.create({
    data: {
      eventId,
      cityId: (await prisma.event.findUnique({ where: { id: eventId }, select: { cityId: true } }))!.cityId,
      channelDbId: channelId,
      status: "PENDING",
    },
  });

  return NextResponse.json({ post, message: "Добавлено в очередь публикации" });
}
