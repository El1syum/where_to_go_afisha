import { Readable } from "stream";
import { prisma } from "../shared/db.js";
import { logger } from "../shared/logger.js";
import { config } from "../shared/config.js";
import { fetchXmlStream } from "../xml-importer/fetcher.js";
import { createFileStream } from "../xml-importer/parser.js";
import { parseAdmitadStream } from "./parser.js";
import { transformAdmitadOffer } from "./transformer.js";
import { upsertBatch, resetCaches } from "./upserter.js";
import type { TransformedEvent } from "../xml-importer/transformer.js";

export async function runAdmitadImport(localFilePath?: string) {
  const running = await prisma.importLog.findFirst({
    where: {
      source: "ADMITAD",
      status: "RUNNING",
      startedAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });

  if (running) {
    logger.warn("Another Admitad import is already running, skipping");
    return;
  }

  const importLog = await prisma.importLog.create({
    data: { source: "ADMITAD", status: "RUNNING" },
  });

  const startTime = Date.now();
  let totalNew = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const allErrors: Array<{ externalId: string; error: string }> = [];
  const seenExternalIds = new Set<string>();

  resetCaches();

  let cleanupFn: (() => Promise<void>) | null = null;

  try {
    let inputStream: Readable;
    if (localFilePath) {
      inputStream = createFileStream(localFilePath);
    } else {
      const { stream, cleanup } = await fetchXmlStream(config.admitadFeed.url);
      inputStream = stream;
      cleanupFn = cleanup;
    }

    let batch: TransformedEvent[] = [];

    const { totalOffers } = await parseAdmitadStream(inputStream, async (rawOffer) => {
      const transformed = transformAdmitadOffer(rawOffer);
      if (!transformed) {
        totalSkipped++;
        return;
      }

      seenExternalIds.add(transformed.externalId);
      batch.push(transformed);

      if (batch.length >= config.admitadFeed.batchSize) {
        const result = await upsertBatch(batch);
        totalNew += result.newCount;
        totalUpdated += result.updatedCount;
        totalSkipped += result.skippedCount;
        totalErrors += result.errorCount;
        allErrors.push(...result.errors);
        batch = [];
      }
    });

    if (batch.length > 0) {
      const result = await upsertBatch(batch);
      totalNew += result.newCount;
      totalUpdated += result.updatedCount;
      totalSkipped += result.skippedCount;
      totalErrors += result.errorCount;
      allErrors.push(...result.errors);
    }

    // Deactivate events no longer in feed
    if (seenExternalIds.size > 50) {
      const deactivated = await prisma.$executeRawUnsafe(`
        UPDATE "Event" SET "isActive" = false
        WHERE source = 'ADMITAD' AND "isActive" = true
          AND "externalId" NOT IN (${[...seenExternalIds].map(id => `'${id.replace(/'/g, "''")}'`).join(",")})
      `);
      if (typeof deactivated === "number" && deactivated > 0) {
        logger.info(`Admitad: deactivated ${deactivated} events no longer in feed`);
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    await prisma.importLog.update({
      where: { id: importLog.id },
      data: {
        status: "COMPLETED",
        totalItems: totalOffers,
        newItems: totalNew,
        updatedItems: totalUpdated,
        skippedItems: totalSkipped,
        errorItems: totalErrors,
        errors: allErrors.length > 0 ? allErrors.slice(0, 100) : undefined,
        duration,
        finishedAt: new Date(),
      },
    });

    logger.info(
      { totalOffers, new: totalNew, updated: totalUpdated, skipped: totalSkipped, errors: totalErrors, duration: `${duration}s` },
      "Admitad import completed"
    );
  } catch (err) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    await prisma.importLog.update({
      where: { id: importLog.id },
      data: {
        status: "FAILED",
        errorItems: totalErrors + 1,
        errors: [
          ...allErrors.slice(0, 99),
          { externalId: "FATAL", error: err instanceof Error ? err.message : String(err) },
        ],
        duration,
        finishedAt: new Date(),
      },
    });
    logger.error(err, "Admitad import failed");
    throw err;
  } finally {
    if (cleanupFn) await cleanupFn();
  }
}
