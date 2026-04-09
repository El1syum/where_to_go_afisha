import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { saveBannerFile } from "../route";

const IMAGES_DIR = process.env.IMAGES_DIR || "/opt/afisha/images";

/**
 * Update banner. Accepts multipart/form-data (to allow optional new image)
 * with fields: title, subtitle, linkUrl, sortOrder, isActive, image (optional).
 * If `image` is provided, it replaces the existing image (old file is deleted
 * when it lived under /api/images/banners/).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    const formData = await request.formData();
    const data: Record<string, unknown> = {};

    const title = (formData.get("title") as string | null)?.trim();
    const subtitle = (formData.get("subtitle") as string | null)?.trim();
    const linkUrl = formData.get("linkUrl");
    const sortOrderRaw = formData.get("sortOrder");
    const isActiveRaw = formData.get("isActive");
    const cityIdRaw = formData.get("cityId");
    const image = formData.get("image");

    if (title !== undefined && title !== null && title !== "") data.title = title;
    if (subtitle !== undefined && subtitle !== null && subtitle !== "") data.subtitle = subtitle;

    if (linkUrl !== null) {
      const trimmed = (linkUrl as string).trim();
      data.linkUrl = trimmed || null;
    }

    if (sortOrderRaw !== null) {
      const n = parseInt(sortOrderRaw as string, 10);
      if (Number.isFinite(n)) data.sortOrder = n;
    }

    if (isActiveRaw !== null) {
      data.isActive = isActiveRaw === "true" || isActiveRaw === "1";
    }

    if (cityIdRaw !== null) {
      const v = cityIdRaw as string;
      if (v === "") {
        data.cityId = null; // global
      } else {
        const n = parseInt(v, 10);
        if (Number.isFinite(n)) data.cityId = n;
      }
    }

    if (image && image instanceof File && image.size > 0) {
      const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
      if (!ALLOWED.has(image.type)) {
        return NextResponse.json({ error: "only jpg/png/webp allowed" }, { status: 400 });
      }
      if (image.size > 8 * 1024 * 1024) {
        return NextResponse.json({ error: "image too large (max 8MB)" }, { status: 400 });
      }
      const newUrl = await saveBannerFile(image);
      data.imageUrl = newUrl;

      // Delete old image if it's one we managed (under /api/images/banners/)
      if (existing.imageUrl.startsWith("/api/images/banners/")) {
        const relative = existing.imageUrl.replace("/api/images/", "");
        const oldPath = join(IMAGES_DIR, relative);
        await unlink(oldPath).catch(() => {});
      }
    }

    const banner = await prisma.banner.update({
      where: { id },
      data,
      include: { city: { select: { slug: true, name: true } } },
    });
    return NextResponse.json(banner);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update banner" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.banner.delete({ where: { id } });

  // Clean up image file if managed by us
  if (existing.imageUrl.startsWith("/api/images/banners/")) {
    const relative = existing.imageUrl.replace("/api/images/", "");
    const oldPath = join(IMAGES_DIR, relative);
    await unlink(oldPath).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
