import { spawn } from "child_process";

/**
 * Resize an image buffer and convert to webp, matching the same pipeline
 * as scripts/sync-images.sh (max 1200px wide, quality 80).
 *
 * Uses ImageMagick's `convert` via stdin/stdout. Returns null if the tool
 * fails or the output is empty; the caller can fall back to the raw buffer.
 */
export function convertImageToWebp(
  input: Buffer,
  { maxWidth = 1200, quality = 80, timeoutMs = 10000 }: {
    maxWidth?: number;
    quality?: number;
    timeoutMs?: number;
  } = {},
): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const proc = spawn("convert", [
      "-", // stdin
      "-resize", `${maxWidth}x>`,
      "-quality", String(quality),
      "-strip", // drop metadata
      "webp:-", // stdout as webp
    ], { stdio: ["pipe", "pipe", "pipe"] });

    const chunks: Buffer[] = [];
    let errOutput = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill("SIGKILL");
      resolve(null);
    }, timeoutMs);

    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    proc.stderr.on("data", (chunk: Buffer) => { errOutput += chunk.toString(); });

    proc.on("error", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(null);
    });

    proc.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        resolve(null);
        return;
      }
      const out = Buffer.concat(chunks);
      if (out.byteLength < 100) {
        resolve(null);
        return;
      }
      // Silence unused error output when exit code is 0 (ImageMagick warnings)
      void errOutput;
      resolve(out);
    });

    proc.stdin.on("error", () => { /* ignore EPIPE */ });
    proc.stdin.end(input);
  });
}
