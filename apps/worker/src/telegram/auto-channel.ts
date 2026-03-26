import { Bot } from "grammy";
import { prisma } from "../shared/db.js";
import { logger } from "../shared/logger.js";

// Map of common city keywords in channel names to city slugs
const CITY_KEYWORDS: Record<string, string> = {
  moscow: "moscow", msk: "moscow", москва: "moscow", мск: "moscow",
  spb: "saint-petersburg", piter: "saint-petersburg", питер: "saint-petersburg", "санкт-петербург": "saint-petersburg", "петербург": "saint-petersburg",
  ekb: "yekaterinburg", екб: "yekaterinburg", екатеринбург: "yekaterinburg",
  nsk: "novosibirsk", новосибирск: "novosibirsk",
  kazan: "kazan", казань: "kazan",
  krasnoyarsk: "krasnoyarsk", красноярск: "krasnoyarsk",
  nn: "nizhny-novgorod", "нижний": "nizhny-novgorod",
  perm: "perm", пермь: "perm",
  rostov: "rostov-na-donu", ростов: "rostov-na-donu", rnd: "rostov-na-donu",
  krasnodar: "krasnodar", краснодар: "krasnodar",
  samara: "samara", самара: "samara",
  voronezh: "voronezh", воронеж: "voronezh",
  ufa: "ufa", уфа: "ufa",
  volgograd: "volgograd", волгоград: "volgograd",
  chelyabinsk: "chelyabinsk", челябинск: "chelyabinsk",
  omsk: "omsk", омск: "omsk",
  tyumen: "tyumen", тюмень: "tyumen",
  kaliningrad: "kaliningrad", калининград: "kaliningrad",
  yaroslavl: "yaroslavl", ярославль: "yaroslavl",
  sochi: "sochi", сочи: "sochi",
  tula: "tula", тула: "tula",
  irkutsk: "irkutsk", иркутск: "irkutsk",
  tomsk: "tomsk", томск: "tomsk",
  vladivostok: "vladivostok", владивосток: "vladivostok",
  saratov: "saratov", саратов: "saratov",
  khabarovsk: "khabarovsk", хабаровск: "khabarovsk",
  tver: "tver", тверь: "tver",
  barnaul: "barnaul", барнаул: "barnaul",
  ryazan: "ryazan", рязань: "ryazan",
  izhevsk: "izhevsk", ижевск: "izhevsk",
};

function detectCitySlug(text: string): string | null {
  const lower = text.toLowerCase().replace(/[_\-]/g, " ");
  for (const [keyword, slug] of Object.entries(CITY_KEYWORDS)) {
    if (lower.includes(keyword)) return slug;
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
    if (oldStatus === "administrator") return; // already was admin

    const channelId = `@${chat.username}` || String(chat.id);
    const channelTitle = chat.title || "";
    const channelUsername = chat.username || "";

    logger.info({ channelId, channelTitle, channelUsername }, "Bot added to channel");

    // Try to detect city from channel username or title
    const citySlug = detectCitySlug(channelUsername) || detectCitySlug(channelTitle);

    let cityId: number | null = null;
    let cityName = "";

    if (citySlug) {
      const city = await prisma.city.findUnique({
        where: { slug: citySlug },
        select: { id: true, name: true },
      });
      if (city) {
        cityId = city.id;
        cityName = city.name;
      }
    }

    if (!cityId) {
      logger.warn({ channelId, channelTitle }, "Could not detect city, channel created but auto-posting disabled");
    }

    // Check if channel already exists
    const existing = await prisma.channel.findFirst({
      where: {
        channelId: channelUsername ? `@${channelUsername}` : String(chat.id),
      },
    });

    if (existing) {
      logger.info({ channelId: existing.channelId }, "Channel already exists in DB");
      return;
    }

    // Create channel with default settings
    const channel = await prisma.channel.create({
      data: {
        cityId: cityId || 1, // fallback to first city
        platform: "TELEGRAM",
        name: channelTitle || channelUsername || "Новый канал",
        description: cityName ? `Автопостинг: ${cityName}` : "Город не определён",
        channelId: channelUsername ? `@${channelUsername}` : String(chat.id),
        channelUrl: channelUsername ? `https://t.me/${channelUsername}` : null,
        isActive: !!cityId, // auto-posting only if city detected
        categories: JSON.stringify(["concerts", "theatre"]), // concerts + theatre by default
        publishHourFrom: 9,
        publishHourTo: 22,
        maxPostsPerDay: 4,
        postIntervalMinutes: 120, // every 2 hours
        aiRephrase: false,
      },
    });

    logger.info(
      {
        channelId: channel.channelId,
        city: cityName || "not detected",
        isActive: channel.isActive,
      },
      "Channel auto-created"
    );

    // Send welcome message to the channel
    try {
      const statusText = cityId
        ? `Канал привязан к городу: ${cityName}\nАвтопостинг: включён (концерты, театр, 4 поста/день)`
        : `Город не определён автоматически.\nНастройте канал в админке: ${process.env.SITE_URL || "https://kudaafisha.ru"}/admin/channels`;

      await ctx.api.sendMessage(
        chat.id,
        `👋 Бот подключён!\n\n${statusText}\n\n🔧 Управление: ${process.env.SITE_URL || "https://kudaafisha.ru"}/admin/channels`,
      );
    } catch (err) {
      logger.warn({ err }, "Could not send welcome message");
    }
  });
}
