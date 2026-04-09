import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { saveBannerFile } from "@/lib/banner-upload";

const MAX_BANNER_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banners = await prisma.banner.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { city: { select: { slug: true, name: true } } },
  });
  return NextResponse.json(banners);
}

/**
 * Create banner. Accepts multipart/form-data with fields:
 *  - title (string, required)
 *  - subtitle (string, required)
 *  - linkUrl (string, optional)
 *  - image (File, required) — jpg/png/webp, max 8MB
 */
export async function POST(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const title = (formData.get("title") as string | null)?.trim();
    const subtitle = (formData.get("subtitle") as string | null)?.trim();
    const linkUrl = (formData.get("linkUrl") as string | null)?.trim() || null;
    const cityIdRaw = formData.get("cityId") as string | null;
    const cityId = cityIdRaw && cityIdRaw !== "" ? parseInt(cityIdRaw, 10) : null;
    const image = formData.get("image");

    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
    if (!subtitle) return NextResponse.json({ error: "subtitle required" }, { status: 400 });
    if (!image || !(image instanceof File)) {
      return NextResponse.json({ error: "image required" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(image.type)) {
      return NextResponse.json({ error: "only jpg/png/webp allowed" }, { status: 400 });
    }
    if (image.size > MAX_BANNER_SIZE) {
      return NextResponse.json({ error: "image too large (max 8MB)" }, { status: 400 });
    }

    const imageUrl = await saveBannerFile(image);

    // Place new banner after the current max sortOrder
    const agg = await prisma.banner.aggregate({ _max: { sortOrder: true } });
    const nextOrder = (agg._max.sortOrder ?? 0) + 10;

    const banner = await prisma.banner.create({
      data: {
        title,
        subtitle,
        imageUrl,
        linkUrl,
        cityId: cityId != null && Number.isFinite(cityId) ? cityId : null,
        sortOrder: nextOrder,
        isActive: true,
      },
      include: { city: { select: { slug: true, name: true } } },
    });

    return NextResponse.json(banner);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create banner" },
      { status: 500 }
    );
  }
}

