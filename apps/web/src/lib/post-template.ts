import { prisma } from "./db";
import { rephraseText } from "./ai";

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

async function getGlobalTemplate(): Promise<string> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "post_template" } });
    return setting?.value || DEFAULT_TEMPLATE;
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://kudaafisha.ru";

interface EventData {
  title: string;
  description: string | null;
  date: Date;
  place: string | null;
  price: unknown;
  imageUrl: string | null;
  isAvailable: boolean;
  age: number | null;
  slug: string;
  city: { slug: string; name: string };
  category: { slug: string; name: string };
}

interface ChannelData {
  channelId: string;
  postTemplate?: string | null;
  aiRephrase?: boolean;
  aiPrompt?: string | null;
  aiModel?: string | null;
}

export async function renderPostFromTemplate(
  event: EventData,
  channel: ChannelData,
): Promise<string> {
  const emoji = CATEGORY_EMOJI[event.category.slug] || "📌";
  const utm = `?utm_source=telegram&utm_medium=channel&utm_campaign=${encodeURIComponent(channel.channelId.replace("@", ""))}`;
  const eventPageUrl = `${SITE_URL}/${event.city.slug}/${event.category.slug}/${event.slug}${utm}`;

  const cleanPlace = event.place ? event.place.split(/\s*&\s*/)[0].trim() : null;
  const placeLine = cleanPlace || `<a href="${eventPageUrl}">Узнать на сайте</a>`;

  const tags: string[] = [`#${event.category.name.replace(/[^а-яА-ЯёЁa-zA-Z0-9]/g, "")}`];
  if (cleanPlace) {
    const placeTag = cleanPlace.replace(/[^а-яА-ЯёЁa-zA-Z0-9]/g, "");
    if (placeTag.length <= 30) tags.push(`#${placeTag}`);
  }

  const template = channel.postTemplate || await getGlobalTemplate();

  const vars: Record<string, string> = {
    "<TYPE_EMOJI>": emoji,
    "<TYPE>": event.category.name,
    "<NAME>": event.title,
    "<DATE>": formatDate(event.date),
    "<PLACE>": placeLine,
    "<PRICE>": formatPrice(event.price != null ? Number(event.price) : null, event.isAvailable),
    "<URL>": eventPageUrl,
    "<BUTTON>": event.isAvailable ? "Купить билет" : "Подробнее",
    "<TAGS>": tags.join(" "),
    "<CITY>": event.city.name,
    "<AGE>": event.age != null ? `${event.age}+` : "",
  };

  let text = template;

  // <<DESCRIPTION>> = AI rephrase
  if (text.includes("<<DESCRIPTION>>")) {
    if (channel.aiRephrase && event.description) {
      const input = `Мероприятие: ${event.title}\nМесто: ${cleanPlace || "не указано"}\nКатегория: ${event.category.name}\n\nОписание:\n${event.description.substring(0, 1000)}`;
      const rephrased = await rephraseText(input, channel.aiPrompt, channel.aiModel);
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

  // <DESCRIPTION> = plain
  if (text.includes("<DESCRIPTION>")) {
    text = text.replace("<DESCRIPTION>", event.description?.substring(0, 300) || "");
  }

  for (const [key, value] of Object.entries(vars)) {
    text = text.replaceAll(key, value);
  }

  // Sanitize: replace <br> with newlines, strip unsupported HTML tags
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/?(p|div|span|ul|ol|li|h[1-6]|img|table|tr|td|th|thead|tbody|font|center|section|article|header|footer|nav|main|aside|figure|figcaption|details|summary|mark|small|sub|sup|dl|dt|dd|hr|wbr|abbr|address|cite|q|var|samp|kbd|ruby|rt|rp|bdi|bdo|data|time|meter|progress|output|canvas|svg|math|iframe|embed|object|video|audio|source|track|map|area|form|input|textarea|select|option|button|label|fieldset|legend|datalist|optgroup|keygen)(\s[^>]*)?\/?>/gi, "");
  return text.replace(/\n{3,}/g, "\n\n").trim();
}
