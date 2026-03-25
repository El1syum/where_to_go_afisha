import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const channel = await prisma.channel.create({
    data: {
      cityId: body.cityId,
      platform: body.platform || "TELEGRAM",
      name: body.name,
      description: body.description || null,
      channelId: body.channelId,
      channelUrl: body.channelUrl || null,
      categories: body.categories || null,
      minAge: body.minAge ?? null,
      maxAge: body.maxAge ?? null,
      kidsOnly: body.kidsOnly || false,
      publishHourFrom: body.publishHourFrom ?? 9,
      publishHourTo: body.publishHourTo ?? 22,
      maxPostsPerDay: body.maxPostsPerDay ?? 10,
      aiRephrase: body.aiRephrase || false,
      aiModel: body.aiModel || null,
      aiPrompt: body.aiPrompt || null,
      postIntervalMinutes: body.postIntervalMinutes ?? 30,
    },
  });

  return NextResponse.json({ channel });
}
