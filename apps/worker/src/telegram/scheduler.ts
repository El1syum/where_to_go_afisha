import { logger } from "../shared/logger.js";
import { postNewEvents } from "./poster.js";

export async function runTelegramPosting() {
  logger.info("Starting Telegram posting run...");
  const posted = await postNewEvents();
  logger.info(`Telegram posting complete: ${posted} events posted`);
}
