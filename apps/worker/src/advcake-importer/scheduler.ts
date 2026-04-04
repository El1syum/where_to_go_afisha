import { Readable } from "stream";
import { prisma } from "../shared/db.js";
import { logger } from "../shared/logger.js";
import { config } from "../shared/config.js";
import { fetchXmlStream } from "../xml-importer/fetcher.js";
import { createFileStream } from "../xml-importer/parser.js";
import { parseAdvCakeStream } from "./parser.js";
import { transformAdvCakeOffer } from "./transformer.js";
import { upsertBatch, resetCaches } from "./upserter.js";
import type { TransformedEvent } from "../xml-importer/transformer.js";

export async function runAdvCakeImport(localFilePath?: string) {
  const running = await prisma.importLog.findFirst({
    where: {
      source: "ADVCAKE",
      status: "RUNNING",
      startedAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });

  if (running) {
    logger.warn("Another AdvCake import is already running, skipping");
    return;
  }

  const importLog = await prisma.importLog.create({
    data: { source: "ADVCAKE", status: "RUNNING" },
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
      const { stream, cleanup } = await fetchXmlStream(config.advcakeFeed.url);
      inputStream = stream;
      cleanupFn = cleanup;
    }

    // Collect transformed events synchronously during parsing
    const collected: TransformedEvent[] = [];

    const { totalOffers } = await parseAdvCakeStream(inputStream, async (rawOffer) => {
      const transformed = transformAdvCakeOffer(rawOffer);
      if (!transformed) {
        totalSkipped++;
        return;
      }
      seenExternalIds.add(transformed.externalId);
      collected.push(transformed);
    });

    // Process collected events in sequential batches
    for (let i = 0; i < collected.length; i += config.advcakeFeed.batchSize) {
      const batch = collected.slice(i, i + config.advcakeFeed.batchSize);
      const result = await upsertBatch(batch);
      totalNew += result.newCount;
      totalUpdated += result.updatedCount;
      totalSkipped += result.skippedCount;
      totalErrors += result.errorCount;
      allErrors.push(...result.errors);
    }

    // Deactivate events no longer in feed
    if (seenExternalIds.size > 50) {
      const activeEvents = await prisma.event.findMany({
        where: { source: "ADVCAKE", isActive: true },
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
        logger.info(`AdvCake: deactivated ${toDeactivate.length} events no longer in feed`);
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
      "AdvCake import completed"
    );
  } catch (err) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    try {
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
    } catch (updateErr) {
      logger.error(updateErr, "Failed to update import log to FAILED status");
    }
    logger.error(err, "AdvCake import failed");
    throw err;
  } finally {
    if (cleanupFn) await cleanupFn();
  }
}
