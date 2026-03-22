import "dotenv/config";
import cron from "node-cron";
import { logger } from "./shared/logger.js";
import { config } from "./shared/config.js";
import { prisma } from "./shared/db.js";
import { runXmlImport } from "./xml-importer/scheduler.js";
import { runTelegramPosting } from "./telegram/scheduler.js";

async function deactivatePastEvents() {
  const result = await prisma.event.updateMany({
    where: {
      date: { lt: new Date() },
      isActive: true,
    },
    data: { isActive: false },
  });
  logger.info(`Deactivated ${result.count} past events`);
}

// CLI: run import once if --import flag is passed
const args = process.argv.slice(2);
if (args.includes("--import")) {
  logger.info("Running one-time XML import...");
  runXmlImport(args.includes("--local") ? "example.xml" : undefined)
    .then(() => { logger.info("Import done"); process.exit(0); })
    .catch((e) => { logger.error(e, "Import failed"); process.exit(1); });
} else {
  main().catch((e) => { logger.error(e, "Worker failed to start"); process.exit(1); });
}

async function main() {
  logger.info("Worker starting...");

  // XML import cron
  if (config.xmlFeed.url) {
    cron.schedule(config.xmlFeed.cronSchedule, async () => {
      logger.info("Starting scheduled XML import...");
      await runXmlImport().catch((e) =>
        logger.error(e, "XML import failed")
      );
    });
    logger.info(`XML import scheduled: ${config.xmlFeed.cronSchedule}`);
  } else {
    logger.warn("XML_FEED_URL not set, XML import disabled");
  }

  // Telegram posting cron
  if (config.telegram.botToken) {
    cron.schedule(config.telegram.cronSchedule, async () => {
      await runTelegramPosting().catch((e) =>
        logger.error(e, "Telegram posting failed")
      );
    });
    logger.info(`Telegram posting scheduled: ${config.telegram.cronSchedule}`);
  } else {
    logger.warn("TELEGRAM_BOT_TOKEN not set, Telegram posting disabled");
  }

  // Cleanup past events
  cron.schedule(config.cleanup.cronSchedule, async () => {
    await deactivatePastEvents().catch((e) =>
      logger.error(e, "Past events cleanup failed")
    );
  });
  logger.info(`Past events cleanup scheduled: ${config.cleanup.cronSchedule}`);

  logger.info("Worker is running. Press Ctrl+C to stop.");
}
