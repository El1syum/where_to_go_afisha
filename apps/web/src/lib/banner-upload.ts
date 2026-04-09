import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";

const IMAGES_DIR = process.env.IMAGES_DIR || "/opt/afisha/images";
const BANNER_SUBDIR = "banners";

/**
 * Save an uploaded File to /opt/afisha/images/banners/{timestamp}-{rand}.{ext}
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
