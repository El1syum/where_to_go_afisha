import type { RawOffer } from "./parser.js";

/**
 * Parse date string, treating date-only values as Moscow time (UTC+3)
 * to prevent timezone drift when stored in Postgres.
 */
function parseDateMoscow(dateStr: string): Date | null {
  if (!dateStr) return null;
  // If date has no time component (e.g. "2026-03-25"), treat as Moscow midnight
  if (!dateStr.includes("T") && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    const d = new Date(dateStr.trim() + "T00:00:00+03:00");
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}
import { extractCitySlug, extractOriginalUrl } from "./city-extractor.js";

export interface TransformedEvent {
  externalId: string;
  citySlug: string;
  categorySourceId: string;
  slug: string;
  title: string;
  description: string | null;
  date: Date;
  place: string | null;
  price: number | null;
  imageUrl: string | null;
  affiliateUrl: string | null;
  originalUrl: string | null;
  age: number | null;
  isKids: boolean;
  isPremiere: boolean;
  isAvailable: boolean;
  modifiedTime: bigint | null;
}

function transliterate(str: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
    ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
    н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
    ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return str
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("");
}

function slugify(str: string, externalId: string): string {
  // Remove common prefix "Билеты на "
  let clean = str.replace(/^Билеты на\s+/i, "");
  const slug = transliterate(clean)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
  return `${slug}-${externalId.replace(/x/g, "-")}`;
}

export function transformOffer(raw: RawOffer): TransformedEvent | null {
  if (!raw.id || !raw.url || !raw.name) return null;

  const citySlug = extractCitySlug(raw.url);
  if (!citySlug) return null;

  const date = parseDateMoscow(raw.date);
  if (!date) return null;

  // Skip events at foreign venues miscategorized under Russian cities
  const placeLower = (raw.place || "").toLowerCase();
  const nameLower = raw.name.toLowerCase();
  const foreignMarkers = ["оаэ", "абу-даби", "дубай", "dubai", "abu dhabi", "турция", "turkey", "таиланд", "thailand"];
  if (foreignMarkers.some((m) => placeLower.includes(m) || nameLower.includes(m))) return null;

  // Hide price for unavailable offers (e.g. kassir available="false")
  const isAvailable = raw.available !== "false";
  const price = isAvailable && raw.price ? parseFloat(raw.price) : null;

  return {
    externalId: raw.id,
    citySlug,
    categorySourceId: raw.categoryId || "10",
    slug: slugify(raw.name, raw.id),
    title: raw.name.replace(/^Билеты на\s+/i, ""),
    description: raw.description || null,
    date,
    place: raw.place || null,
    price: price && !isNaN(price) ? price : null,
    imageUrl: raw.picture || null,
    affiliateUrl: raw.url || null,
    originalUrl: extractOriginalUrl(raw.url),
    age: raw.age ? parseInt(raw.age, 10) : null,
    isKids: raw.isKids === "true",
    isPremiere: raw.isPremiere === "true",
    isAvailable,
    modifiedTime: raw.modifiedTime ? BigInt(raw.modifiedTime) : null,
  };
}
