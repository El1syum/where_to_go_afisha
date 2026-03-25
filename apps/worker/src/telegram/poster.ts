import { Bot } from "grammy";
import { prisma } from "../shared/db.js";
import { logger } from "../shared/logger.js";
import { config } from "../shared/config.js";
import { formatTelegramPost } from "./formatter.js";
import { rephraseText } from "../shared/ai.js";

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
  const channels = await prisma.channel.findMany({
    where: {
      isActive: true,
      platform: "TELEGRAM",
    },
    include: {
      city: true,
    },
  });

  if (channels.length === 0) {
    logger.info("No active Telegram channels configured");
    return 0;
  }

  let totalPosted = 0;
  const tgBot = getBot();
  const now = new Date();
  const currentHour = now.getHours();
  const futureLimit = new Date(
    now.getTime() + config.telegram.daysAhead * 24 * 60 * 60 * 1000
  );

  for (const channel of channels) {
    // Check publish hours
    if (currentHour < channel.publishHourFrom || currentHour >= channel.publishHourTo) {
      continue;
    }

    // Check daily limit
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const postedToday = await prisma.telegramPost.count({
      where: {
        channelDbId: channel.id,
        status: "SENT",
        sentAt: { gte: todayStart },
      },
    });

    if (postedToday >= channel.maxPostsPerDay) {
      continue;
    }

    // Check post interval
    const lastPost = await prisma.telegramPost.findFirst({
      where: {
        channelDbId: channel.id,
        status: "SENT",
        sentAt: { not: null },
      },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    });

    if (lastPost?.sentAt) {
      const minutesSince = (now.getTime() - lastPost.sentAt.getTime()) / 60000;
      if (minutesSince < (channel.postIntervalMinutes ?? 30)) {
        continue;
      }
    }

    // Build event filter
    const categoryFilter = channel.categories
      ? { slug: { in: JSON.parse(channel.categories) as string[] } }
      : undefined;

    const events = await prisma.event.findMany({
      where: {
        cityId: channel.cityId,
        isActive: true,
        isApproved: true,
        date: { gt: now, lt: futureLimit },
        ...(categoryFilter && { category: categoryFilter }),
        ...(channel.kidsOnly && { isKids: true }),
        ...(channel.minAge != null && { age: { gte: channel.minAge } }),
        telegramPosts: {
          none: { channelDbId: channel.id },
        },
      },
      include: {
        city: true,
        category: true,
      },
      orderBy: { date: "asc" },
      take: Math.min(config.telegram.maxPostsPerRun, channel.maxPostsPerDay - postedToday),
    });

    for (const event of events) {
      try {
        let { text, imageUrl } = formatTelegramPost(event, channel.channelId);

        // AI rephrase if enabled
        if (channel.aiRephrase && event.description) {
          const cleanPlace = event.place ? event.place.split(/\s*&\s*/)[0].trim() : "не указано";
          const input = `Мероприятие: ${event.title}\nМесто: ${cleanPlace}\nКатегория: ${event.category.name}\n\nОписание:\n${event.description.substring(0, 1000)}`;
          const snippet = await rephraseText(input, channel.aiPrompt, channel.aiModel);
          if (snippet && !snippet.startsWith(event.title)) {
            text = text.replace(
              `<b>${event.title}</b>\n`,
              `<b>${event.title}</b>\n\n${snippet.substring(0, 500)}\n`,
            );
          }
        }

        let messageId: number;

        if (imageUrl) {
          // Send photo with caption, fallback to text if photo fails
          try {
            const sent = await tgBot.api.sendPhoto(
              channel.channelId,
              imageUrl,
              {
                caption: text,
                parse_mode: "HTML",
              }
            );
            messageId = sent.message_id;
          } catch {
            const sent = await tgBot.api.sendMessage(
              channel.channelId,
              text,
              {
                parse_mode: "HTML",
                link_preview_options: { is_disabled: false },
              }
            );
            messageId = sent.message_id;
          }
        } else {
          // Send text only
          const sent = await tgBot.api.sendMessage(
            channel.channelId,
            text,
            {
              parse_mode: "HTML",
              link_preview_options: { is_disabled: false },
            }
          );
          messageId = sent.message_id;
        }

        await prisma.telegramPost.create({
          data: {
            eventId: event.id,
            cityId: channel.cityId,
            channelDbId: channel.id,
            messageId,
            channelId: channel.channelId,
            status: "SENT",
            sentAt: new Date(),
          },
        });

        totalPosted++;
        logger.info({ eventId: event.id, channel: channel.channelId }, "Posted to Telegram");
        await delay(config.telegram.postDelay);
      } catch (err) {
        logger.error(
          { eventId: event.id, channel: channel.channelId, err },
          "Failed to post to Telegram"
        );

        await prisma.telegramPost.create({
          data: {
            eventId: event.id,
            cityId: channel.cityId,
            channelDbId: channel.id,
            channelId: channel.channelId,
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
