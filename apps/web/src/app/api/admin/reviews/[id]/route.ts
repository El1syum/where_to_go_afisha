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

  const review = await prisma.review.update({
    where: { id: parseInt(id) },
    data: {
      ...(body.isApproved !== undefined && { isApproved: body.isApproved }),
    },
  });

  return NextResponse.json({ review });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.review.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ ok: true });
}
