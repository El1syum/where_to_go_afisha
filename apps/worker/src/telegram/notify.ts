import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";

const ADMIN_CHAT_ID = process.env.ADMIN_TELEGRAM_ID || "-1003211104896";

/**
 * Send a notification message to the admin via Telegram.
 */
export async function notifyAdmin(message: string): Promise<void> {
  if (!config.telegram.botToken || !ADMIN_CHAT_ID) return;

  try {
    await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    logger.warn({ err }, "Failed to notify admin");
  }
}
