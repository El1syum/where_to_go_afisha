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

    // Collect transformed events synchronously during parsing
    // (SAX parser doesn't await async callbacks — doing DB work
    // inside onOffer causes thousands of concurrent queries)
    const collected: TransformedEvent[] = [];

    const { totalOffers } = await parseXmlStream(inputStream, async (rawOffer) => {
      const transformed = transformOffer(rawOffer);
      if (!transformed) {
        totalSkipped++;
        return;
      }
      seenExternalIds.add(transformed.externalId);
      collected.push(transformed);
    });

    // Process collected events in sequential batches
    for (let i = 0; i < collected.length; i += config.xmlFeed.batchSize) {
      const batch = collected.slice(i, i + config.xmlFeed.batchSize);
      const result = await upsertBatch(batch);
      totalNew += result.newCount;
      totalUpdated += result.updatedCount;
      totalSkipped += result.skippedCount;
      totalErrors += result.errorCount;
      allErrors.push(...result.errors);
    }

    // Deactivate events no longer in the feed (skip if too few parsed — possible partial feed)
    if (seenExternalIds.size > 100) {
      const activeEvents = await prisma.event.findMany({
        where: { source: "YANDEX_XML", isActive: true },
        select: { id: true, externalId: true },
      });
      const toDeactivate = activeEvents
        .filter((e) => !seenExternalIds.has(e.externalId))
        .map((e) => e.id);

      if (toDeactivate.length > 0) {
        for (let i = 0; i < toDeactivate.length; i += 5000) {
          await prisma.event.updateMany({
            where: { id: { in: toDeactivate.slice(i, i + 5000) } },
            data: { isActive: false },
          });
        }
        logger.info(`Deactivated ${toDeactivate.length} events no longer in feed`);
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
        deactivatedCheck: seenExternalIds.size,
        duration: `${duration}s`,
      },
      "XML import completed"
    );
  } catch (err) {
    const duration = Math.round((Date.now() - startTime) / 1000);

    try {
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
    } catch (updateErr) {
      logger.error(updateErr, "Failed to update import log to FAILED status");
    }

    logger.error(err, "XML import failed");
    throw err;
  } finally {
    if (cleanupFn) await cleanupFn();
  }
}
