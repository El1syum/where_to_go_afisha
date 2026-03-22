import { createWriteStream } from "fs";
import { unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { logger } from "../shared/logger.js";
import { createFileStream } from "./parser.js";

const MAX_RETRIES = 3;
const INITIAL_DELAY = 3000;

/**
 * Downloads XML feed to a temporary file, then returns a readable stream.
 * More reliable than streaming directly for large files (63MB+).
 */
export async function fetchXmlStream(url: string): Promise<{ stream: Readable; cleanup: () => Promise<void> }> {
  const tmpPath = join(tmpdir(), `afisha-feed-${Date.now()}.xml`);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info({ url: url.substring(0, 80) + "...", attempt }, "Downloading XML feed...");

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      if (!response.body) {
        throw new Error("Response body is null");
      }

      // Download to temp file
      const nodeStream = Readable.fromWeb(response.body as any);
      const fileStream = createWriteStream(tmpPath);
      await pipeline(nodeStream, fileStream);

      logger.info({ tmpPath }, "XML feed downloaded successfully");

      // Return readable stream from file
      const stream = createFileStream(tmpPath);
      const cleanup = async () => {
        try { await unlink(tmpPath); } catch {}
      };

      return { stream, cleanup };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      logger.warn({ attempt, error: lastError.message }, `Download attempt ${attempt} failed`);

      // Clean up partial file
      try { await unlink(tmpPath); } catch {}

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_DELAY * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error("Failed to download XML feed");
}
