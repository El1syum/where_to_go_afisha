import { prisma } from "../shared/db.js";
import { logger } from "../shared/logger.js";
import { config } from "../shared/config.js";
import { formatTelegramPost } from "./formatter.js";

const MAX_API = "https://platform-api.max.ru";

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function maxApiRequest(endpoint: string, body?: unknown): Promise<Response> {
  const url = `${MAX_API}${endpoint}`;
  const headers: Record<string, string> = {
    "Authorization": config.max.botToken,
  };
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(url, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function postMaxEvents(): Promise<number> {
  if (!config.max.botToken) return 0;

  const channels = await prisma.channel.findMany({
    where: { isActive: true, platform: "MAX" },
    include: { city: true },
  });

  if (channels.length === 0) return 0;

  let totalPosted = 0;
  const now = new Date();
  const currentHour = now.getHours();
  const futureLimit = new Date(
    now.getTime() + config.telegram.daysAhead * 24 * 60 * 60 * 1000
  );

  for (const channel of channels) {
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

    if (postedToday >= channel.maxPostsPerDay) continue;

    // Check interval
    const lastPost = await prisma.telegramPost.findFirst({
      where: { channelDbId: channel.id, status: "SENT", sentAt: { not: null } },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true, event: { select: { categoryId: true } } },
    });

    if (lastPost?.sentAt) {
      const minutesSince = (now.getTime() - lastPost.sentAt.getTime()) / 60000;
      if (minutesSince < (channel.postIntervalMinutes ?? 240)) continue;
    }

    // Category alternation
    const lastCategoryId = lastPost?.event?.categoryId ?? null;
    let categoryWhere = "";
    if (channel.categories) {
      const slugs = JSON.parse(channel.categories) as string[];
      categoryWhere = `AND c."slug" IN (${slugs.map(s => `'${s.replace(/'/g, "''")}'`).join(",")})`;
    }
    let extraWhere = "";
    if (channel.kidsOnly) extraWhere += ` AND e."isKids" = true`;
    if (channel.minAge != null) extraWhere += ` AND e."age" >= ${channel.minAge}`;
    const excludeCat = lastCategoryId ? `AND e."categoryId" != ${lastCategoryId}` : "";

    let eventRows = await prisma.$queryRawUnsafe<Array<{id: number}>>(`
      SELECT e."id" FROM "Event" e
      JOIN "Category" c ON c."id" = e."categoryId"
      WHERE e."cityId" = $1 AND e."isActive" = true AND e."isApproved" = true
        AND e."date" > $2 AND e."date" < $3
        ${categoryWhere} ${extraWhere} ${excludeCat}
        AND NOT EXISTS (SELECT 1 FROM "TelegramPost" tp WHERE tp."eventId" = e."id" AND tp."channelDbId" = $4)
      ORDER BY e."price" DESC NULLS LAST, e."date" ASC LIMIT 1
    `, channel.cityId, now, futureLimit, channel.id);

    if (eventRows.length === 0 && lastCategoryId) {
      eventRows = await prisma.$queryRawUnsafe<Array<{id: number}>>(`
        SELECT e."id" FROM "Event" e
        JOIN "Category" c ON c."id" = e."categoryId"
        WHERE e."cityId" = $1 AND e."isActive" = true AND e."isApproved" = true
          AND e."date" > $2 AND e."date" < $3
          ${categoryWhere} ${extraWhere}
          AND NOT EXISTS (SELECT 1 FROM "TelegramPost" tp WHERE tp."eventId" = e."id" AND tp."channelDbId" = $4)
        ORDER BY e."price" DESC NULLS LAST, e."date" ASC LIMIT 1
      `, channel.cityId, now, futureLimit, channel.id);
    }

    if (eventRows.length === 0) continue;

    const event = await prisma.event.findUnique({
      where: { id: eventRows[0].id },
      include: { city: true, category: true },
    });
    if (!event) continue;

    try {
      const { text, imageUrl } = await formatTelegramPost(
        event, channel.channelId,
        channel.postTemplate, channel.aiRephrase, channel.aiPrompt, channel.aiModel,
      );

      // Convert HTML to Max-compatible format (Max supports basic HTML)
      const maxText = text;

      const body: Record<string, unknown> = {
        text: maxText,
        format: "html",
        notify: true,
      };

      // Add image attachment if available
      if (imageUrl) {
        body.attachments = [{
          type: "image",
          payload: { url: imageUrl },
        }];
      }

      const res = await maxApiRequest(`/messages?chat_id=${channel.channelId}`, body);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Max API ${res.status}: ${errText}`);
      }

      const data = await res.json() as { message?: { body?: { mid?: string } } };
      const messageId = data.message?.body?.mid || "0";

      await prisma.telegramPost.create({
        data: {
          eventId: event.id,
          cityId: channel.cityId,
          channelDbId: channel.id,
          messageId: parseInt(messageId) || 0,
          channelId: channel.channelId,
          status: "SENT",
          sentAt: new Date(),
        },
      });

      totalPosted++;
      logger.info({ eventId: event.id, channel: channel.channelId }, "Posted to Max");
      await delay(config.telegram.postDelay);
    } catch (err) {
      logger.error({ eventId: event.id, channel: channel.channelId, err }, "Failed to post to Max");
      await prisma.telegramPost.create({
        data: {
          eventId: event.id,
          cityId: channel.cityId,
          channelDbId: channel.id,
          channelId: channel.channelId,
          status: "FAILED",
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  return totalPosted;
}
