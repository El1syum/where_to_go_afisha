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

  const city = await prisma.city.update({
    where: { id: parseInt(id) },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.namePrepositional !== undefined && { namePrepositional: body.namePrepositional }),
      ...(body.nameGenitive !== undefined && { nameGenitive: body.nameGenitive }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.telegramChannelId !== undefined && { telegramChannelId: body.telegramChannelId }),
      ...(body.telegramChannelUsername !== undefined && { telegramChannelUsername: body.telegramChannelUsername }),
      ...(body.seoText !== undefined && { seoText: body.seoText }),
      ...(body.metaTitle !== undefined && { metaTitle: body.metaTitle }),
      ...(body.metaDescription !== undefined && { metaDescription: body.metaDescription }),
    },
  });

  return NextResponse.json({ city });
}
