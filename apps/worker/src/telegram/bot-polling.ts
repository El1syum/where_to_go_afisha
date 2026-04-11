import { Bot } from "grammy";
import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import { setupAutoChannel } from "./auto-channel.js";
import { ensureTelegramProxy } from "../shared/tg-proxy.js";

let pollingBot: Bot | null = null;

export async function startBotPolling() {
  if (!config.telegram.botToken) {
    logger.warn("No bot token, skipping polling");
    return;
  }

  const apiRoot = await ensureTelegramProxy();
  pollingBot = new Bot(config.telegram.botToken, apiRoot ? { client: { apiRoot } } : undefined);

  // Setup auto-channel detection
  setupAutoChannel(pollingBot);

  // Start long polling (non-blocking)
  pollingBot.start({
    allowed_updates: ["my_chat_member"],
    onStart: () => {
      logger.info("Bot polling started (listening for channel additions)");
    },
  });

  // Handle graceful shutdown
  process.once("SIGINT", () => pollingBot?.stop());
  process.once("SIGTERM", () => pollingBot?.stop());
}
