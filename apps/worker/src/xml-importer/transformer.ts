import type { RawOffer } from "./parser.js";
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

  const date = new Date(raw.date);
  if (isNaN(date.getTime())) return null;

  const price = raw.price ? parseFloat(raw.price) : null;

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
    modifiedTime: raw.modifiedTime ? BigInt(raw.modifiedTime) : null,
  };
}
