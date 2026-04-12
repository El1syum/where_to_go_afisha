import { Bot, InputFile } from "grammy";
import { prisma } from "../shared/db.js";
import { logger } from "../shared/logger.js";
import { config } from "../shared/config.js";
import { formatTelegramPost } from "./formatter.js";
import { ensureTelegramProxy } from "../shared/tg-proxy.js";

let bot: Bot | null = null;
let botApiRoot: string | null | undefined = undefined; // undefined = not initialized

async function getBot(): Promise<Bot> {
  const apiRoot = await ensureTelegramProxy();

  // Recreate bot if apiRoot changed
  if (bot && apiRoot !== botApiRoot) {
    bot = null;
  }

  if (!bot) {
    bot = new Bot(config.telegram.botToken, apiRoot ? { client: { apiRoot } } : undefined);
    botApiRoot = apiRoot;
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
  const tgBot = await getBot();
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

    // Build filters for raw query
    let categoryWhere = "";
    if (channel.categories) {
      const slugs = JSON.parse(channel.categories) as string[];
      categoryWhere = `AND c."slug" IN (${slugs.map(s => `'${s.replace(/'/g, "''")}'`).join(",")})`;
    }

    let extraWhere = "";
    if (channel.kidsOnly) extraWhere += ` AND e."isKids" = true`;
    if (channel.minAge != null) extraWhere += ` AND e."age" >= ${channel.minAge}`;

    // Get last posted category to alternate
    const lastPostedEvent = await prisma.telegramPost.findFirst({
      where: { channelDbId: channel.id, status: "SENT" },
      orderBy: { sentAt: "desc" },
      include: { event: { select: { categoryId: true } } },
    });
    const lastCategoryId = lastPostedEvent?.event?.categoryId ?? null;

    // Try to pick from a different category than last post, sorted by price desc
    let excludeCategoryWhere = lastCategoryId ? `AND e."categoryId" != ${lastCategoryId}` : "";

    let events = await prisma.$queryRawUnsafe<Array<{id: number}>>(`
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
        ${excludeCategoryWhere}
        AND NOT EXISTS (
          SELECT 1 FROM "TelegramPost" tp
          WHERE tp."eventId" = e."id" AND tp."channelDbId" = $4
        )
      ORDER BY e."price" DESC NULLS LAST, e."date" ASC
      LIMIT 1
    `, channel.cityId, now, futureLimit, channel.id);

    // Fallback: if no events in other categories, allow same category
    if (events.length === 0 && lastCategoryId) {
      events = await prisma.$queryRawUnsafe<Array<{id: number}>>(`
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
        ORDER BY e."price" DESC NULLS LAST, e."date" ASC
        LIMIT 1
      `, channel.cityId, now, futureLimit, channel.id);
    }

    // Load full event data
    const fullEvents = events.length > 0
      ? await prisma.event.findMany({
          where: { id: events[0].id },
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
            let photoInput: string | InputFile = imageUrl;

            // For local images, send the file directly (more reliable than URL)
            if (imageUrl.includes("/api/images/")) {
              const { readFile } = await import("fs/promises");
              const { join } = await import("path");
              const filename = imageUrl.split("/api/images/")[1];
              const filePath = join(process.env.IMAGES_DIR || "/opt/afisha/images", filename);
              try {
                const fileData = await readFile(filePath);
                photoInput = new InputFile(fileData, filename);
              } catch {
                // File not on disk, fall through with URL
              }
            }

            const sent = await tgBot.api.sendPhoto(
              channel.channelId,
              photoInput,
              {
                caption: text,
                parse_mode: "HTML",
              }
            );
            messageId = sent.message_id;
          } catch (photoErr) {
            logger.warn(
              { eventId: event.id, channel: channel.channelId, err: photoErr instanceof Error ? photoErr.message : String(photoErr) },
              "sendPhoto failed, falling back to text"
            );
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
