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

function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price: number | null): string {
  if (!price || price === 0) return "Бесплатно";
  return `от ${price.toLocaleString("ru-RU")} ₽`;
}

export function formatTelegramPost(
  event: Event & { city: City; category: Category }
): string {
  const emoji = CATEGORY_EMOJI[event.category.slug] || "📌";
  const lines: string[] = [];

  lines.push(`${emoji} <b>${event.category.name}</b>`);
  lines.push("━━━━━━━━━━━━━━━");
  lines.push(`<b>${event.title}</b>`);
  lines.push("");
  lines.push(`📅 ${formatDate(event.date)}`);

  if (event.place) {
    lines.push(`📍 ${event.place}`);
  }

  lines.push(`💰 ${formatPrice(Number(event.price))}`);

  const badges: string[] = [];
  if (event.age != null) badges.push(`${event.age}+`);
  if (event.isKids) badges.push("👶 Детское");
  if (event.isPremiere) badges.push("🌟 Премьера");
  if (badges.length > 0) lines.push(badges.join(" | "));

  if (event.affiliateUrl) {
    lines.push("");
    lines.push(`🎟 <a href="${event.affiliateUrl}">Купить билет</a>`);
  }

  lines.push("");
  lines.push(`#${event.city.name.replace(/[^а-яА-ЯёЁa-zA-Z0-9]/g, "")} #${event.category.name.replace(/[^а-яА-ЯёЁa-zA-Z0-9]/g, "")}`);

  return lines.join("\n");
}
