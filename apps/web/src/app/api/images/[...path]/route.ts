import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const IMAGES_DIR = process.env.IMAGES_DIR || "/opt/afisha/images";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const filePath = join(IMAGES_DIR, ...path);

  // Security: prevent path traversal
  if (!filePath.startsWith(IMAGES_DIR)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await readFile(filePath);
  const ext = filePath.split(".").pop()?.toLowerCase();
  const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  return new NextResponse(file, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=2592000, immutable",
    },
  });
}
