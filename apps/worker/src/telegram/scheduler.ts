import { logger } from "../shared/logger.js";
import { postNewEvents } from "./poster.js";
import { postMaxEvents } from "./max-poster.js";
import { notifyAdmin } from "./notify.js";

// Accumulate stats between reports
let statsPostedTg = 0;
let statsPostedMax = 0;
let statsErrors = 0;
let statsRuns = 0;
let lastReportTime = Date.now();

const REPORT_INTERVAL_MS = 5 * 60 * 60 * 1000; // 5 hours

export async function runTelegramPosting() {
  logger.info("Starting posting run (Telegram + Max)...");
  statsRuns++;

  try {
    const tgPosted = await postNewEvents();
    statsPostedTg += tgPosted;
    logger.info(`Telegram posting: ${tgPosted} events posted`);
  } catch (err) {
    statsErrors++;
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(err, "Telegram posting failed");
    await notifyAdmin(`❌ Ошибка автопостинга TG:\n${msg}`);
  }

  try {
    const maxPosted = await postMaxEvents();
    statsPostedMax += maxPosted;
    if (maxPosted > 0) {
      logger.info(`Max posting: ${maxPosted} events posted`);
    }
  } catch (err) {
    statsErrors++;
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(err, "Max posting failed");
    await notifyAdmin(`❌ Ошибка автопостинга Max:\n${msg}`);
  }

  // Send summary every 5 hours
  const elapsed = Date.now() - lastReportTime;
  if (elapsed >= REPORT_INTERVAL_MS) {
    await sendReport();
  }
}

async function sendReport() {
  const hours = Math.round((Date.now() - lastReportTime) / 3600000);
  const total = statsPostedTg + statsPostedMax;

  const lines = [
    `📊 <b>Автопостинг за ${hours}ч</b>`,
    ``,
    `▸ Запусков: ${statsRuns}`,
    `▸ Telegram: ${statsPostedTg}`,
    `▸ Max: ${statsPostedMax}`,
    `▸ Всего: ${total}`,
  ];

  if (statsErrors > 0) {
    lines.push(`▸ Ошибок: ${statsErrors}`);
  }

  if (total === 0) {
    lines.push(``, `Нет новых мероприятий для публикации`);
  }

  await notifyAdmin(lines.join("\n"));

  statsPostedTg = 0;
  statsPostedMax = 0;
  statsErrors = 0;
  statsRuns = 0;
  lastReportTime = Date.now();
}
