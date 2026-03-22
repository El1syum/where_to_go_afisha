import { Bot } from "grammy";
import { prisma } from "../shared/db.js";
import { logger } from "../shared/logger.js";
import { config } from "../shared/config.js";
import { formatTelegramPost } from "./formatter.js";

let bot: Bot | null = null;

function getBot(): Bot {
  if (!bot) {
    bot = new Bot(config.telegram.botToken);
  }
  return bot;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function postNewEvents(): Promise<number> {
  // Find cities with configured Telegram channels
  const cities = await prisma.city.findMany({
    where: {
      isActive: true,
      telegramChannelId: { not: null },
    },
  });

  if (cities.length === 0) {
    logger.info("No cities with Telegram channels configured");
    return 0;
  }

  let totalPosted = 0;
  const tgBot = getBot();
  const now = new Date();
  const futureLimit = new Date(
    now.getTime() + config.telegram.daysAhead * 24 * 60 * 60 * 1000
  );

  for (const city of cities) {
    if (!city.telegramChannelId) continue;

    // Find events that haven't been posted to this city's channel
    const events = await prisma.event.findMany({
      where: {
        cityId: city.id,
        isActive: true,
        isApproved: true,
        date: { gt: now, lt: futureLimit },
        telegramPosts: {
          none: { cityId: city.id },
        },
      },
      include: {
        city: true,
        category: true,
      },
      orderBy: { date: "asc" },
      take: config.telegram.maxPostsPerRun,
    });

    for (const event of events) {
      try {
        const message = formatTelegramPost(event);

        const sent = await tgBot.api.sendMessage(
          city.telegramChannelId,
          message,
          {
            parse_mode: "HTML",
            link_preview_options: { is_disabled: false },
          }
        );

        await prisma.telegramPost.create({
          data: {
            eventId: event.id,
            cityId: city.id,
            messageId: sent.message_id,
            channelId: city.telegramChannelId,
            status: "SENT",
            sentAt: new Date(),
          },
        });

        totalPosted++;
        await delay(config.telegram.postDelay);
      } catch (err) {
        logger.error(
          { eventId: event.id, citySlug: city.slug, err },
          "Failed to post to Telegram"
        );

        await prisma.telegramPost.create({
          data: {
            eventId: event.id,
            cityId: city.id,
            channelId: city.telegramChannelId,
            status: "FAILED",
            errorMessage:
              err instanceof Error ? err.message : String(err),
          },
        });
      }
    }
  }

  return totalPosted;
}
