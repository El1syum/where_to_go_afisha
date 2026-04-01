import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import { prisma } from "../shared/db.js";
import { notifyAdmin } from "./notify.js";

const MAX_API = "https://platform-api.max.ru";

interface MaxUpdate {
  update_type: string;
  timestamp: number;
  chat_id?: number;
  message?: {
    sender?: { user_id: number; name: string };
    body?: { mid: string; text?: string };
  };
  // bot_added event
  chat?: {
    chat_id: number;
    type: string;
    title: string;
    link?: string;
    participants_count?: number;
  };
  user?: {
    user_id: number;
    name: string;
  };
}

interface MaxUpdatesResponse {
  updates: MaxUpdate[];
  marker?: number;
}

async function maxApi(endpoint: string): Promise<Response> {
  return fetch(`${MAX_API}${endpoint}`, {
    headers: { Authorization: config.max.botToken },
  });
}

/**
 * Detect city from channel title by matching against DB cities.
 */
async function detectCity(text: string): Promise<{ id: number; slug: string; name: string } | null> {
  if (!text) return null;
  const lower = text.toLowerCase().replace(/[_\-\.]/g, " ").trim();

  const cities = await prisma.city.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, name: true },
  });

  const ABBR: Record<string, string> = {
    msk: "moscow", мск: "moscow",
    spb: "saint-petersburg", питер: "saint-petersburg", спб: "saint-petersburg",
    ekb: "yekaterinburg", екб: "yekaterinburg",
    nsk: "novosibirsk", нск: "novosibirsk",
    ростов: "rostov-na-donu",
    kzn: "kazan",
  };

  for (const [abbr, slug] of Object.entries(ABBR)) {
    if (lower.includes(abbr)) {
      const city = cities.find((c) => c.slug === slug);
      if (city) return city;
    }
  }

  for (const city of cities) {
    if (lower.includes(city.slug.replace(/-/g, " ")) || lower.includes(city.slug.replace(/-/g, ""))) {
      return city;
    }
  }

  for (const city of cities) {
    if (lower.includes(city.name.toLowerCase())) {
      return city;
    }
  }

  return null;
}

let marker: number | null = null;
let polling = false;

async function pollUpdates() {
  const endpoint = marker
    ? `/updates?marker=${marker}&timeout=25&types=bot_added`
    : `/updates?timeout=25&types=bot_added`;

  try {
    const res = await maxApi(endpoint);
    if (!res.ok) {
      const text = await res.text();
      logger.warn({ status: res.status, body: text }, "Max polling error");
      return;
    }

    const data = (await res.json()) as MaxUpdatesResponse;
    if (data.marker) marker = data.marker;

    for (const update of data.updates || []) {
      await handleUpdate(update);
    }
  } catch (err) {
    logger.warn({ err }, "Max polling fetch error");
  }
}

async function handleUpdate(update: MaxUpdate) {
  if (update.update_type !== "bot_added") return;
  if (!update.chat) return;

  const chat = update.chat;
  const chatId = String(chat.chat_id);
  const title = chat.title || "";

  logger.info({ chatId, title, type: chat.type }, "Max: bot added to chat");

  // Only handle channels and chats
  if (chat.type !== "channel" && chat.type !== "chat") return;

  // Check if already exists
  const existing = await prisma.channel.findFirst({
    where: { channelId: chatId, platform: "MAX" },
  });

  if (existing) {
    logger.info({ chatId }, "Max channel already exists in DB");
    await notifyAdmin(`ℹ️ Max бот добавлен в канал, но он уже есть в БД\n\nКанал: ${title}\nID: ${chatId}`);
    return;
  }

  const city = await detectCity(title);

  const channel = await prisma.channel.create({
    data: {
      cityId: city?.id || 1,
      platform: "MAX",
      name: title || "Новый канал Max",
      description: city ? `Автопостинг Max: ${city.name}` : "Город не определён",
      channelId: chatId,
      channelUrl: chat.link || null,
      isActive: !!city,
      publishHourFrom: 9,
      publishHourTo: 22,
      maxPostsPerDay: 4,
      postIntervalMinutes: 240,
      aiRephrase: false,
    },
  });

  if (city) {
    await notifyAdmin(
      `✅ Max канал подключён!\n\n` +
      `Канал: ${title}\n` +
      `ID: ${chatId}\n` +
      `Город: ${city.name}\n` +
      `Автопостинг: ВКЛ\n` +
      `Постов/день: 4`
    );
  } else {
    await notifyAdmin(
      `⚠️ Max канал, город НЕ определён\n\n` +
      `Канал: ${title}\n` +
      `ID: ${chatId}\n` +
      `Автопостинг: ВЫКЛ\n\n` +
      `Настройте вручную: /admin/channels`
    );
  }

  // Send welcome message
  try {
    const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://kudaafisha.ru";
    const cityUrl = city ? `${siteUrl}/${city.slug}` : siteUrl;
    const text = city
      ? `Смотрите все события города ${city.name} на портале\n${cityUrl}`
      : `Смотрите все события на портале\n${siteUrl}`;

    await fetch(`${MAX_API}/messages?chat_id=${chat.chat_id}`, {
      method: "POST",
      headers: {
        Authorization: config.max.botToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    logger.warn({ err }, "Could not send Max welcome message");
  }

  logger.info({ chatId, city: city?.name || "unknown", isActive: channel.isActive }, "Max channel auto-created");
}

export async function startMaxPolling() {
  if (!config.max.botToken) {
    logger.warn("No MAX_BOT_TOKEN, skipping Max polling");
    return;
  }

  // Verify bot
  try {
    const res = await maxApi("/me");
    if (res.ok) {
      const me = await res.json();
      logger.info({ name: me.name || me.first_name, userId: me.user_id }, "Max bot connected");
    } else {
      logger.warn({ status: res.status }, "Max bot /me check failed");
      return;
    }
  } catch (err) {
    logger.warn({ err }, "Max bot connection failed");
    return;
  }

  polling = true;
  logger.info("Max polling started (listening for bot_added events)");

  // Long-polling loop
  (async () => {
    while (polling) {
      await pollUpdates();
    }
  })();

  process.once("SIGINT", () => { polling = false; });
  process.once("SIGTERM", () => { polling = false; });
}
