import { logger } from "../shared/logger.js";
import { postNewEvents } from "./poster.js";
import { notifyAdmin } from "./notify.js";

export async function runTelegramPosting() {
  logger.info("Starting Telegram posting run...");
  try {
    const posted = await postNewEvents();
    logger.info(`Telegram posting complete: ${posted} events posted`);
    if (posted > 0) {
      await notifyAdmin(`📨 Автопостинг: ${posted} мероприятий опубликовано`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(err, "Telegram posting failed");
    await notifyAdmin(`❌ Ошибка автопостинга:\n${msg}`);
  }
}
