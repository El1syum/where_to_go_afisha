import type { Event, City, Category } from "db";

const CATEGORY_EMOJI: Record<string, string> = {
  films: "🎬",
  concerts: "🎵",
  theatre: "🎭",
  exhibitions: "🖼",
  lectures: "🎓",
  quests: "🔍",
  sport: "⚽",
  excursions: "🗺",
  standup: "🎤",
  events: "🎉",
};

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatDate(date: Date): string {
  const d = date.getDate();
  const m = MONTHS[date.getMonth()];
  return `${d} ${m}`;
}

function formatPrice(price: number | null): string {
  if (price == null) return "Уточняйте при покупке";
  if (price === 0) return "Бесплатно";
  return `от ${price.toLocaleString("ru-RU")} ₽`;
}

// ... skipped down to the Купить билет link replacement ...

  lines.push("");
  lines.push(`🎟 <a href="${eventPageUrl}">Подробнее</a>`);

  lines.push("");
  const tags = [`#${event.category.name.replace(/[^а-яА-ЯёЁa-zA-Z0-9]/g, "")}`];
  if (cleanPlace) {
    const placeTag = cleanPlace.replace(/[^а-яА-ЯёЁa-zA-Z0-9]/g, "");
    if (placeTag.length <= 30) tags.push(`#${placeTag}`);
  }
  lines.push(tags.join(" "));

  return {
    text: lines.join("\n"),
    imageUrl: event.imageUrl || null,
  };
}
