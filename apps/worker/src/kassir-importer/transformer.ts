import type { RawKassirOffer } from "./parser.js";
import type { TransformedEvent } from "../xml-importer/transformer.js";
import { cityNameToSlug } from "../shared/city-map.js";

/**
 * Kassir category IDs → our sourceId.
 * Categories: 3000=Концерт, 3009=Театр, 3016=Шоу, 3022=Детям,
 * 3026=Спорт, 3031=Другое, 3036=Фестивали, 4015=Кино,
 * 4038=Туристам, 4086=Образование, 4093=Музеи, 4150=Выставки,
 * 4163=Экскурсии, 4280=Квизы, 4292=Квесты, 4320=Стендап
 */
const KASSIR_CATEGORY_MAP: Record<string, string> = {
  "3000": "2",  // Концерт
  "3003": "2",  // Концерт (sub)
  "3009": "3",  // Театр
  "3012": "3",  // Театр (sub)
  "3016": "10", // Шоу
  "3022": "10", // Детям
  "3026": "7",  // Спорт
  "3031": "10", // Другое
  "3036": "10", // Фестивали
  "4002": "10", // Праздники
  "4015": "1",  // Кино
  "4038": "8",  // Туристам → Экскурсии
  "4086": "5",  // Образование → Лекции
  "4093": "4",  // Музеи → Выставки
  "4150": "4",  // Выставки
  "4163": "8",  // Экскурсии
  "4280": "6",  // Квизы → Квесты
  "4292": "6",  // Квесты
  "4320": "9",  // Стендап
};

function mapKassirCategory(categoryIds: string[]): string {
  for (const id of categoryIds) {
    const mapped = KASSIR_CATEGORY_MAP[id];
    if (mapped) return mapped;
  }
  return "10";
}

function isKassirKids(categoryIds: string[]): boolean {
  return categoryIds.includes("3022");
}

function transliterate(str: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
    ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
    н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
    ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return str.toLowerCase().split("").map((c) => map[c] ?? c).join("");
}

function slugify(str: string, externalId: string): string {
  const slug = transliterate(str)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
  return `${slug}-k-${externalId}`;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&laquo;/g, "«").replace(/&raquo;/g, "»")
    .replace(/&mdash;/g, "—").replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function transformKassirOffer(raw: RawKassirOffer): TransformedEvent | null {
  if (!raw.id || !raw.name || !raw.city) return null;

  const citySlug = cityNameToSlug(raw.city);
  if (!citySlug) return null;

  // Date format: "2026-04-05T15:00:00+07:00" (ISO with timezone)
  const date = new Date(raw.date);
  if (isNaN(date.getTime())) return null;

  const isAvailable = raw.available !== "false";
  const price = isAvailable && raw.price ? parseFloat(raw.price) : null;

  const categorySourceId = mapKassirCategory(raw.categoryIds);
  const description = raw.description ? decodeHtmlEntities(raw.description) : null;

  return {
    externalId: raw.id,
    citySlug,
    categorySourceId,
    slug: slugify(raw.name, raw.id),
    title: raw.name,
    description,
    date,
    place: raw.venue || null,
    price: price && !isNaN(price) ? price : null,
    imageUrl: raw.picture || null,
    affiliateUrl: raw.url || null,
    originalUrl: null,
    age: null,
    isKids: isKassirKids(raw.categoryIds),
    isPremiere: false,
    isAvailable,
    modifiedTime: raw.modifiedTime ? BigInt(raw.modifiedTime) : null,
  };
}
