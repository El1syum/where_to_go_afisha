import type { RawAdmitadOffer } from "./parser.js";
import type { TransformedEvent } from "../xml-importer/transformer.js";
import { cityNameToSlug } from "../shared/city-map.js";
import { mapAdmitadIdToSourceId } from "../shared/category-map.js";

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
  const slug = transliterate(str)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
  // Admitad IDs are like "Concert_2149841" — use the numeric part
  const numericId = externalId.replace(/[^0-9]/g, "");
  return `${slug}-ad-${numericId}`;
}

/**
 * Admitad date format: "DD.MM.YYYY" or "DD.MM.YYYY HH:MM"
 * Empirically Admitad's feed dates are consistently 1 day earlier than
 * the real event date reported by Yandex Afisha (e.g. Klava Koka
 * Admitad 23.04 vs Yandex 24.04, same 21:00 MSK). Compensate by +1 day.
 */
function parseAdmitadDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // DD.MM.YYYY
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (match) {
    const [, day, month, year, hour, minute] = match;
    const iso = `${year}-${month}-${day}T${hour || "00"}:${minute || "00"}:00+03:00`;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    // Shift +1 day to align with the real event date
    d.setUTCDate(d.getUTCDate() + 1);
    return d;
  }

  // Fallback: try ISO
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function transformAdmitadOffer(raw: RawAdmitadOffer): TransformedEvent | null {
  if (!raw.id || !raw.name || !raw.city) return null;

  const citySlug = cityNameToSlug(raw.city);
  if (!citySlug) return null;

  const date = parseAdmitadDate(raw.date);
  if (!date) return null;

  const isAvailable = raw.available !== "false";
  const price = isAvailable && raw.price ? parseFloat(raw.price) : null;

  const categorySourceId = mapAdmitadIdToSourceId(raw.id);

  const description = raw.description ? decodeHtmlEntities(raw.description) : null;
  const place = raw.model || null;

  const ageStr = typeof raw.age === "string" ? raw.age.replace(/[^0-9]/g, "") : "";
  const age = ageStr ? parseInt(ageStr, 10) : null;

  return {
    externalId: raw.id,
    citySlug,
    cityName: raw.city.trim(),
    categorySourceId,
    slug: slugify(raw.name, raw.id),
    title: raw.name,
    description,
    date,
    place,
    price: price && !isNaN(price) ? price : null,
    imageUrl: raw.picture || null,
    affiliateUrl: raw.url || null,
    originalUrl: null,
    age: age !== null && !isNaN(age) ? age : null,
    isKids: false,
    isPremiere: false,
    isAvailable,
    modifiedTime: raw.modifiedTime ? BigInt(raw.modifiedTime) : null,
  };
}
