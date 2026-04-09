import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth";

const IMAGES_DIR = process.env.IMAGES_DIR || "/opt/afisha/images";
const BANNER_SUBDIR = "banners";
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

/**
 * Save an uploaded File to /opt/afisha/images/banners/{timestamp}.{ext}
 * and return its public /api/images/... URL.
 */
export async function saveBannerFile(file: File): Promise<string> {
  const dir = join(IMAGES_DIR, BANNER_SUBDIR);
  await mkdir(dir, { recursive: true });

  const origExt = (extname(file.name) || "").toLowerCase().replace(".", "");
  const typeExt =
    file.type === "image/jpeg" ? "jpg" :
    file.type === "image/png" ? "png" :
    file.type === "image/webp" ? "webp" : null;
  const ext = typeExt || (["jpg", "jpeg", "png", "webp"].includes(origExt) ? origExt : "jpg");

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filepath = join(dir, filename);

  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));

  return `/api/images/${BANNER_SUBDIR}/${filename}`;
}
