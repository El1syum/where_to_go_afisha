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

    // Build category filter for raw query
    let categoryWhere = "";
    if (categoryFilter) {
      const slugs = JSON.parse(channel.categories!) as string[];
      categoryWhere = `AND c."slug" IN (${slugs.map(s => `'${s.replace(/'/g, "''")}'`).join(",")})`;
    }

    let extraWhere = "";
    if (channel.kidsOnly) extraWhere += ` AND e."isKids" = true`;
    if (channel.minAge != null) extraWhere += ` AND e."age" >= ${channel.minAge}`;

    // Priority: newest imports first (createdAt desc), then expensive first (price desc nulls last), then nearest date
    const events = await prisma.$queryRawUnsafe<Array<{id: number}>>(`
      SELECT e."id"
      FROM "Event" e
      JOIN "Category" c ON c."id" = e."categoryId"
      WHERE e."cityId" = $1
        AND e."isActive" = true
        AND e."isApproved" = true
        AND e."date" > $2
        AND e."date" < $3
        ${categoryWhere}
        ${extraWhere}
        AND NOT EXISTS (
          SELECT 1 FROM "TelegramPost" tp
          WHERE tp."eventId" = e."id" AND tp."channelDbId" = $4
        )
      ORDER BY e."createdAt" DESC, e."price" DESC NULLS LAST, e."date" ASC
      LIMIT 1
    `, channel.cityId, now, futureLimit, channel.id);

    // Load full event data
    const eventIds = events.map(e => e.id);
    const fullEvents = eventIds.length > 0
      ? await prisma.event.findMany({
          where: { id: { in: eventIds } },
          include: { city: true, category: true },
        })
      : [];

    for (const event of fullEvents) {
      try {
        const { text, imageUrl } = await formatTelegramPost(
          event,
          channel.channelId,
          channel.postTemplate,
          channel.aiRephrase,
          channel.aiPrompt,
          channel.aiModel,
        );

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
