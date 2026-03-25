import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const channel = await prisma.channel.update({
    where: { id: parseInt(id) },
    data: {
      ...(body.cityId !== undefined && { cityId: body.cityId }),
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.channelId !== undefined && { channelId: body.channelId }),
      ...(body.channelUrl !== undefined && { channelUrl: body.channelUrl }),
      ...(body.platform !== undefined && { platform: body.platform }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.categories !== undefined && { categories: body.categories }),
      ...(body.minAge !== undefined && { minAge: body.minAge }),
      ...(body.maxAge !== undefined && { maxAge: body.maxAge }),
      ...(body.kidsOnly !== undefined && { kidsOnly: body.kidsOnly }),
      ...(body.publishHourFrom !== undefined && { publishHourFrom: body.publishHourFrom }),
      ...(body.publishHourTo !== undefined && { publishHourTo: body.publishHourTo }),
      ...(body.maxPostsPerDay !== undefined && { maxPostsPerDay: body.maxPostsPerDay }),
      ...(body.aiRephrase !== undefined && { aiRephrase: body.aiRephrase }),
      ...(body.aiModel !== undefined && { aiModel: body.aiModel }),
      ...(body.aiPrompt !== undefined && { aiPrompt: body.aiPrompt }),
      ...(body.postIntervalMinutes !== undefined && { postIntervalMinutes: body.postIntervalMinutes }),
    },
  });

  return NextResponse.json({ channel });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.channel.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
