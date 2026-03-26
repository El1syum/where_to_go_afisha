import { Bot } from "grammy";
import { prisma } from "../shared/db.js";
import { logger } from "../shared/logger.js";
import { notifyAdmin } from "./notify.js";

/**
 * Detect city from channel username or title by matching against all cities in DB.
 * Checks: slug match, Russian name match, transliterated name match.
 */
async function detectCity(text: string): Promise<{ id: number; slug: string; name: string } | null> {
  if (!text) return null;

  const lower = text.toLowerCase().replace(/[_\-\.]/g, " ").trim();

  // Load all cities from DB
  const cities = await prisma.city.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, name: true },
  });

  // Common abbreviations
  const ABBR: Record<string, string> = {
    msk: "moscow", мск: "moscow",
    spb: "saint-petersburg", питер: "saint-petersburg", "спб": "saint-petersburg",
    ekb: "yekaterinburg", екб: "yekaterinburg",
    nsk: "novosibirsk", нск: "novosibirsk",
    rnd: "rostov-na-donu", ростов: "rostov-na-donu",
    nn: "nizhny-novgorod",
    kzn: "kazan",
    krsk: "krasnoyarsk",
    nsk: "novosibirsk",
  };

  // Check abbreviations first
  for (const [abbr, slug] of Object.entries(ABBR)) {
    if (lower.includes(abbr)) {
      const city = cities.find((c) => c.slug === slug);
      if (city) return city;
    }
  }

  // Check slug match (e.g. "moscow_kudaafisha" contains "moscow")
  for (const city of cities) {
    if (lower.includes(city.slug.replace(/-/g, " ")) || lower.includes(city.slug.replace(/-/g, ""))) {
      return city;
    }
  }

  // Check Russian name match (e.g. "Афиша Москва" contains "Москва")
  for (const city of cities) {
    if (lower.includes(city.name.toLowerCase())) {
      return city;
    }
  }

  return null;
}

export function setupAutoChannel(bot: Bot) {
  bot.on("my_chat_member", async (ctx) => {
    const chat = ctx.myChatMember.chat;
    const newStatus = ctx.myChatMember.new_chat_member.status;
    const oldStatus = ctx.myChatMember.old_chat_member.status;

    // Only handle when bot is added as admin to a channel
    if (chat.type !== "channel") return;
    if (newStatus !== "administrator") return;
    if (oldStatus === "administrator") return;

    const channelUsername = chat.username || "";
    const channelTitle = chat.title || "";
    const chatId = String(chat.id);

    logger.info({ chatId, channelUsername, channelTitle }, "Bot added to channel");

    // Check if channel already exists
    const existingId = channelUsername ? `@${channelUsername}` : chatId;
    const existing = await prisma.channel.findFirst({
      where: { channelId: existingId },
    });

    if (existing) {
      logger.info({ channelId: existingId }, "Channel already exists in DB");
      await notifyAdmin(`ℹ️ Бот добавлен в канал, но он уже есть в БД\n\nКанал: ${channelTitle}\nID: ${existingId}`);
      return;
    }

    // Try to detect city from username, then title
    const city = await detectCity(channelUsername) || await detectCity(channelTitle);

    // Create channel
    const channel = await prisma.channel.create({
      data: {
        cityId: city?.id || 1,
        platform: "TELEGRAM",
        name: channelTitle || channelUsername || "Новый канал",
        description: city ? `Автопостинг: ${city.name}` : "Город не определён",
        channelId: channelUsername ? `@${channelUsername}` : chatId,
        channelUrl: channelUsername ? `https://t.me/${channelUsername}` : null,
        isActive: !!city, // auto-posting only if city detected
        categories: JSON.stringify(["concerts", "theatre"]),
        publishHourFrom: 9,
        publishHourTo: 22,
        maxPostsPerDay: 4,
        postIntervalMinutes: 120,
        aiRephrase: false,
      },
    });

    // Notify admin
    if (city) {
      await notifyAdmin(
        `✅ Новый канал подключён!\n\n` +
        `Канал: ${channelTitle}\n` +
        `ID: ${channel.channelId}\n` +
        `Город: ${city.name}\n` +
        `Автопостинг: ВКЛ\n` +
        `Категории: Концерты, Театр\n` +
        `Постов/день: 4`
      );
    } else {
      await notifyAdmin(
        `⚠️ Новый канал, город НЕ определён\n\n` +
        `Канал: ${channelTitle}\n` +
        `ID: ${channel.channelId}\n` +
        `Автопостинг: ВЫКЛ\n\n` +
        `Настройте вручную: /admin/channels`
      );
    }

    // Send welcome message to the channel
    try {
      const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://kudaafisha.ru";
      const statusText = city
        ? `✅ Канал привязан к городу: ${city.name}\n📋 Автопостинг: концерты, театр — 4 поста/день`
        : `⚠️ Город не определён автоматически.\n🔧 Настройте в админке: ${siteUrl}/admin/channels`;

      await ctx.api.sendMessage(chat.id, `👋 Бот подключён!\n\n${statusText}`);
    } catch (err) {
      logger.warn({ err }, "Could not send welcome message");
    }

    logger.info({ channelId: channel.channelId, city: city?.name || "unknown", isActive: channel.isActive }, "Channel auto-created");
  });
}
