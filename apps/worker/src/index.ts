import "dotenv/config";
import cron from "node-cron";
import { logger } from "./shared/logger.js";
import { config } from "./shared/config.js";
import { prisma } from "./shared/db.js";
import { runXmlImport } from "./xml-importer/scheduler.js";
import { runAdvCakeImport } from "./advcake-importer/scheduler.js";
import { runAdmitadImport } from "./admitad-importer/scheduler.js";
import { runKassirImport } from "./kassir-importer/scheduler.js";
import { runTelegramPosting } from "./telegram/scheduler.js";
import { startBotPolling } from "./telegram/bot-polling.js";
import { startMaxPolling } from "./telegram/max-polling.js";
import { notifyAdmin } from "./telegram/notify.js";

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
  const local = args.includes("--local");

  if (args.includes("--advcake")) {
    logger.info("Running one-time AdvCake import...");
    runAdvCakeImport(local ? "advcake.xml" : undefined)
      .then(() => { logger.info("AdvCake import done"); process.exit(0); })
      .catch((e) => { logger.error(e, "AdvCake import failed"); process.exit(1); });
  } else if (args.includes("--admitad")) {
    logger.info("Running one-time Admitad import...");
    runAdmitadImport(local ? "admitad.xml" : undefined)
      .then(() => { logger.info("Admitad import done"); process.exit(0); })
      .catch((e) => { logger.error(e, "Admitad import failed"); process.exit(1); });
  } else if (args.includes("--kassir")) {
    logger.info("Running one-time Kassir import...");
    runKassirImport(local ? "kassir.xml" : undefined)
      .then(() => { logger.info("Kassir import done"); process.exit(0); })
      .catch((e) => { logger.error(e, "Kassir import failed"); process.exit(1); });
  } else {
    logger.info("Running one-time XML import...");
    runXmlImport(local ? "example.xml" : undefined)
      .then(() => { logger.info("Import done"); process.exit(0); })
      .catch((e) => { logger.error(e, "Import failed"); process.exit(1); });
  }
} else {
  main().catch((e) => { logger.error(e, "Worker failed to start"); process.exit(1); });
}

async function main() {
  logger.info("Worker starting...");

  // XML import cron (Yandex Afisha)
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

  // AdvCake import cron (ticketland.ru)
  if (config.advcakeFeed.url) {
    cron.schedule(config.advcakeFeed.cronSchedule, async () => {
      logger.info("Starting scheduled AdvCake import...");
      await runAdvCakeImport().catch((e) =>
        logger.error(e, "AdvCake import failed")
      );
    });
    logger.info(`AdvCake import scheduled: ${config.advcakeFeed.cronSchedule}`);
  } else {
    logger.warn("ADVCAKE_FEED_URL not set, AdvCake import disabled");
  }

  // Admitad import cron (afisha.ru)
  if (config.admitadFeed.url) {
    cron.schedule(config.admitadFeed.cronSchedule, async () => {
      logger.info("Starting scheduled Admitad import...");
      await runAdmitadImport().catch((e) =>
        logger.error(e, "Admitad import failed")
      );
    });
    logger.info(`Admitad import scheduled: ${config.admitadFeed.cronSchedule}`);
  } else {
    logger.warn("ADMITAD_FEED_URL not set, Admitad import disabled");
  }

  // Kassir import cron (kassir.ru)
  if (config.kassirFeed.url) {
    cron.schedule(config.kassirFeed.cronSchedule, async () => {
      logger.info("Starting scheduled Kassir import...");
      await runKassirImport().catch((e) =>
        logger.error(e, "Kassir import failed")
      );
    });
    logger.info(`Kassir import scheduled: ${config.kassirFeed.cronSchedule}`);
  } else {
    logger.warn("KASSIR_FEED_URL not set, Kassir import disabled");
  }

  // Telegram posting cron
  if (config.telegram.botToken) {
    cron.schedule(config.telegram.cronSchedule, async () => {
      await runTelegramPosting().catch((e) =>
        logger.error(e, "Telegram posting failed")
      );
    });
    logger.info(`Telegram posting scheduled: ${config.telegram.cronSchedule}`);

    // Start bot polling for auto-channel detection
    startBotPolling().catch((e) => logger.error(e, "Bot polling failed"));
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

  // Max auto-channel detection
  if (config.max.botToken) {
    startMaxPolling().catch((e) => logger.error(e, "Max polling failed"));
  }

  logger.info("Worker is running. Press Ctrl+C to stop.");
}
