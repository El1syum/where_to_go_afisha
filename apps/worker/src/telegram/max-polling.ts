import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import { prisma } from "../shared/db.js";
import { notifyAdmin } from "./notify.js";

const MAX_API = "https://platform-api.max.ru";

async function maxApi(endpoint: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = {
    "Authorization": config.max.botToken,
  };
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(`${MAX_API}${endpoint}`, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
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

const POLL_INTERVAL = 15_000; // check every 15 seconds
const FETCH_TIMEOUT = 10_000; // 10s fetch timeout

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollUpdates() {
  const endpoint = marker
    ? `/updates?marker=${marker}&timeout=5`
    : `/updates?timeout=5`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(`${MAX_API}${endpoint}`, {
      headers: { Authorization: config.max.botToken },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text();
      logger.warn({ status: res.status, body: text }, "Max polling error");
      return;
    }

    const data = await res.json() as { updates?: unknown[]; marker?: number };
    if (data.marker) marker = data.marker;

    for (const update of data.updates || []) {
      const u = update as Record<string, unknown>;
      const updateType = u.update_type || u.type || "unknown";
      logger.info({ updateType }, "Max update received");

      if (updateType === "bot_added") {
        await handleBotAdded(u);
      }
    }
  } catch (err) {
    // Silently handle timeouts/aborts, only log real errors
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("abort")) {
      logger.warn({ err: msg }, "Max polling fetch error");
    }
  }
}

async function handleBotAdded(update: Record<string, unknown>) {
  // chat_id can be at update.chat.chat_id or directly at update.chat_id
  const chat = update.chat as Record<string, unknown> | undefined;
  const chatId = String(chat?.chat_id || update.chat_id || "");

  if (!chatId) {
    logger.warn({ update }, "Max bot_added: no chat_id");
    return;
  }

  // Title might not be in the event — fetch chat info from API
  let title = String(chat?.title || "");
  let chatLink = chat?.link ? String(chat.link) : null;

  if (!title) {
    try {
      const res = await maxApi(`/chats/${chatId}`);
      if (res.ok) {
        const chatInfo = await res.json() as Record<string, unknown>;
        title = String(chatInfo.title || "");
        chatLink = chatInfo.link ? String(chatInfo.link) : null;
      }
    } catch (err) {
      logger.warn({ err, chatId }, "Could not fetch Max chat info");
    }
  }

  logger.info({ chatId, title, isChannel: update.is_channel }, "Max: bot added to chat");

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
      channelUrl: chatLink,
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

    await maxApi(`/messages?chat_id=${chatId}`, { text });
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
      const me = await res.json() as Record<string, unknown>;
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
  logger.info("Max polling started (short-poll every 15s)");

  // Short-polling loop with interval
  (async () => {
    while (polling) {
      await pollUpdates();
      if (polling) await delay(POLL_INTERVAL);
    }
  })();

  process.once("SIGINT", () => { polling = false; });
  process.once("SIGTERM", () => { polling = false; });
}
