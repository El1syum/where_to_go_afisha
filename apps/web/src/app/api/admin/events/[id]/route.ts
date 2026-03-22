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

  const event = await prisma.event.update({
    where: { id: parseInt(id) },
    data: {
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.isApproved !== undefined && { isApproved: body.isApproved }),
      ...(body.title !== undefined && { title: body.title }),
    },
  });

  return NextResponse.json({ event });
}
