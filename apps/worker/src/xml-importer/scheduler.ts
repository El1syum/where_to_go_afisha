import { Readable } from "stream";
import { prisma } from "../shared/db.js";
import { logger } from "../shared/logger.js";
import { config } from "../shared/config.js";
import { fetchXmlStream } from "./fetcher.js";
import { parseXmlStream, createFileStream } from "./parser.js";
import { transformOffer, type TransformedEvent } from "./transformer.js";
import { upsertBatch, resetCaches } from "./upserter.js";

export async function runXmlImport(localFilePath?: string) {
  // Check for concurrent import
  const running = await prisma.importLog.findFirst({
    where: {
      source: "YANDEX_XML",
      status: "RUNNING",
      startedAt: { gt: new Date(Date.now() - 60 * 60 * 1000) }, // < 1 hour ago
    },
  });

  if (running) {
    logger.warn("Another XML import is already running, skipping");
    return;
  }

  const importLog = await prisma.importLog.create({
    data: {
      source: "YANDEX_XML",
      status: "RUNNING",
    },
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
    // Get input stream
    let inputStream: Readable;
    if (localFilePath) {
      inputStream = createFileStream(localFilePath);
    } else {
      const { stream, cleanup } = await fetchXmlStream(config.xmlFeed.url);
      inputStream = stream;
      cleanupFn = cleanup;
    }

    // Batch buffer
    let batch: TransformedEvent[] = [];

    const { totalOffers } = await parseXmlStream(inputStream, async (rawOffer) => {
      const transformed = transformOffer(rawOffer);
      if (!transformed) {
        totalSkipped++;
        return;
      }

      seenExternalIds.add(transformed.externalId);
      batch.push(transformed);

      if (batch.length >= config.xmlFeed.batchSize) {
        const result = await upsertBatch(batch);
        totalNew += result.newCount;
        totalUpdated += result.updatedCount;
        totalSkipped += result.skippedCount;
        totalErrors += result.errorCount;
        allErrors.push(...result.errors);
        batch = [];
      }
    });

    // Process remaining batch
    if (batch.length > 0) {
      const result = await upsertBatch(batch);
      totalNew += result.newCount;
      totalUpdated += result.updatedCount;
      totalSkipped += result.skippedCount;
      totalErrors += result.errorCount;
      allErrors.push(...result.errors);
    }

    // Deactivate events no longer in the feed (skip if too few parsed — possible partial feed)
    if (seenExternalIds.size > 100) {
      const deactivated = await prisma.$executeRawUnsafe(`
        UPDATE "Event" SET "isActive" = false
        WHERE source = 'YANDEX_XML' AND "isActive" = true
          AND "externalId" NOT IN (${[...seenExternalIds].map(id => `'${id.replace(/'/g, "''")}'`).join(",")})
      `);
      if (deactivated > 0) {
        logger.info(`Deactivated ${deactivated} events no longer in feed`);
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
      {
        totalOffers,
        new: totalNew,
        updated: totalUpdated,
        skipped: totalSkipped,
        errors: totalErrors,
        deactivated: deactivated.count,
        duration: `${duration}s`,
      },
      "XML import completed"
    );
  } catch (err) {
    const duration = Math.round((Date.now() - startTime) / 1000);

    await prisma.importLog.update({
      where: { id: importLog.id },
      data: {
        status: "FAILED",
        totalItems: 0,
        errorItems: totalErrors + 1,
        errors: [
          ...allErrors.slice(0, 99),
          { externalId: "FATAL", error: err instanceof Error ? err.message : String(err) },
        ],
        duration,
        finishedAt: new Date(),
      },
    });

    logger.error(err, "XML import failed");
    throw err;
  } finally {
    if (cleanupFn) await cleanupFn();
  }
}
