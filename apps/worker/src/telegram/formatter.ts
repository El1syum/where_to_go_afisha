import type { Event, City, Category } from "db";
import { prisma } from "../shared/db.js";
import { rephraseText } from "../shared/ai.js";

const CATEGORY_EMOJI: Record<string, string> = {
  films: "🎬", concerts: "🎵", theatre: "🎭", exhibitions: "🖼",
  lectures: "🎓", quests: "🔍", sport: "⚽", excursions: "🗺",
  standup: "🎤", events: "🎉",
};

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const DEFAULT_TEMPLATE = `<TYPE_EMOJI> <b><TYPE></b>
━━━━━━━━━━━━━━━
<b><NAME></b>

<<DESCRIPTION>>

📅 <DATE>
📍 <PLACE>
💰 <PRICE>

🎟 <a href="<URL>"><BUTTON></a>

<TAGS>`;

function formatDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function formatPrice(price: number | null, isAvailable: boolean): string {
  if (!isAvailable) return "Уточняйте при покупке";
  if (price == null || price === 0) return "Бесплатно";
  return `от ${price.toLocaleString("ru-RU")} ₽`;
}

/**
 * Get the global default template from Settings table.
 */
async function getGlobalTemplate(): Promise<string> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "post_template" } });
    return setting?.value || DEFAULT_TEMPLATE;
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://kudaafisha.ru";

export async function formatTelegramPost(
  event: Event & { city: City; category: Category },
  channelId?: string,
  channelTemplate?: string | null,
  channelAiRephrase?: boolean,
  channelAiPrompt?: string | null,
  channelAiModel?: string | null,
): Promise<{ text: string; imageUrl: string | null }> {
  const emoji = CATEGORY_EMOJI[event.category.slug] || "📌";
  const utm = channelId
    ? `?utm_source=telegram&utm_medium=channel&utm_campaign=${encodeURIComponent(channelId.replace("@", ""))}`
    : "";
  const eventPageUrl = `${SITE_URL}/${event.city.slug}/${event.category.slug}/${event.slug}${utm}`;

  const cleanPlace = event.place
    ? event.place.split(/\s*&\s*/)[0].trim()
    : null;

  const placeLine = cleanPlace || `<a href="${eventPageUrl}">Узнать на сайте</a>`;

  const tags: string[] = [`#${event.category.name.replace(/[^а-яА-ЯёЁa-zA-Z0-9]/g, "")}`];
  if (cleanPlace) {
    const placeTag = cleanPlace.replace(/[^а-яА-ЯёЁa-zA-Z0-9]/g, "");
    if (placeTag.length <= 30) tags.push(`#${placeTag}`);
  }

  // Get template: channel-specific > global > default
  const template = channelTemplate || await getGlobalTemplate();

  // Build variables map
  const vars: Record<string, string> = {
    "<TYPE_EMOJI>": emoji,
    "<TYPE>": event.category.name,
    "<NAME>": event.title,
    "<DATE>": formatDate(event.date),
    "<PLACE>": placeLine,
    "<PRICE>": formatPrice(Number(event.price), event.isAvailable),
    "<URL>": eventPageUrl,
    "<BUTTON>": event.isAvailable ? "Купить билет" : "Подробнее",
    "<TAGS>": tags.join(" "),
    "<CITY>": event.city.name,
    "<AGE>": event.age != null ? `${event.age}+` : "",
  };

  // Process <<DESCRIPTION>> (with AI rephrase) and <DESCRIPTION> (plain)
  let text = template;

  if (text.includes("<<DESCRIPTION>>")) {
    if (channelAiRephrase && event.description) {
      const input = `Мероприятие: ${event.title}\nМесто: ${cleanPlace || "не указано"}\nКатегория: ${event.category.name}\n\nОписание:\n${event.description.substring(0, 1000)}`;
      const rephrased = await rephraseText(input, channelAiPrompt, channelAiModel);
      const desc = (rephrased && !rephrased.startsWith(event.title))
        ? rephrased.substring(0, 500)
        : (event.description?.substring(0, 300) || "");
      text = text.replace("<<DESCRIPTION>>", desc);
    } else if (event.description) {
      text = text.replace("<<DESCRIPTION>>", event.description.substring(0, 300));
    } else {
      text = text.replace("<<DESCRIPTION>>", "");
    }
  }

  if (text.includes("<DESCRIPTION>")) {
    text = text.replace("<DESCRIPTION>", event.description?.substring(0, 300) || "");
  }

  // Replace all variables
  for (const [key, value] of Object.entries(vars)) {
    text = text.replaceAll(key, value);
  }

  // Convert MarkdownV2 spoiler ||text|| → HTML <tg-spoiler> (we use HTML parse_mode)
  // Non-greedy, single-line (spoiler shouldn't span multiple paragraphs).
  text = text.replace(/\|\|([^|\n]+?)\|\|/g, "<tg-spoiler>$1</tg-spoiler>");

  // Sanitize: replace <br> with newlines, strip unsupported HTML tags.
  // Telegram HTML supports: <b>, <i>, <u>, <s>, <a>, <code>, <pre>,
  // <blockquote>, <tg-spoiler>, <tg-emoji>.
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/?(p|div|span|ul|ol|li|h[1-6]|img|table|tr|td|th|thead|tbody|font|center|section|article|header|footer|nav|main|aside|figure|figcaption|details|summary|mark|small|sub|sup|dl|dt|dd|hr|wbr|abbr|address|cite|q|var|samp|kbd|ruby|rt|rp|bdi|bdo|data|time|meter|progress|output|canvas|svg|math|iframe|embed|object|video|audio|source|track|map|area|form|input|textarea|select|option|button|label|fieldset|legend|datalist|optgroup|keygen)(\s[^>]*)?\/?>/gi, "");
  // Clean up empty lines (more than 2 consecutive)
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return {
    text,
    imageUrl: event.imageUrl || null,
  };
}
