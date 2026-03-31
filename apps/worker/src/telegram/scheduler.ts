import { logger } from "../shared/logger.js";
import { postNewEvents } from "./poster.js";
import { notifyAdmin } from "./notify.js";

// Accumulate stats between reports
let statsPosted = 0;
let statsErrors = 0;
let statsRuns = 0;
let lastReportTime = Date.now();

const REPORT_INTERVAL_MS = 5 * 60 * 60 * 1000; // 5 hours

export async function runTelegramPosting() {
  logger.info("Starting Telegram posting run...");
  statsRuns++;

  try {
    const posted = await postNewEvents();
    statsPosted += posted;
    logger.info(`Telegram posting complete: ${posted} events posted`);
  } catch (err) {
    statsErrors++;
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(err, "Telegram posting failed");
    // Critical errors still notify immediately
    await notifyAdmin(`❌ Ошибка автопостинга:\n${msg}`);
  }

  // Send summary every 5 hours
  const elapsed = Date.now() - lastReportTime;
  if (elapsed >= REPORT_INTERVAL_MS) {
    await sendReport();
  }
}

async function sendReport() {
  const hours = Math.round((Date.now() - lastReportTime) / 3600000);

  const lines = [
    `📊 <b>Автопостинг за ${hours}ч</b>`,
    ``,
    `▸ Запусков: ${statsRuns}`,
    `▸ Опубликовано: ${statsPosted}`,
  ];

  if (statsErrors > 0) {
    lines.push(`▸ Ошибок: ${statsErrors}`);
  }

  if (statsPosted === 0) {
    lines.push(``, `Нет новых мероприятий для публикации`);
  }

  await notifyAdmin(lines.join("\n"));

  // Reset counters
  statsPosted = 0;
  statsErrors = 0;
  statsRuns = 0;
  lastReportTime = Date.now();
}
