import type { RawAdvCakeOffer } from "./parser.js";
import type { TransformedEvent } from "../xml-importer/transformer.js";
import { cityNameToSlug } from "../shared/city-map.js";
import { mapCategoryToSourceId, isKidsCategory } from "../shared/category-map.js";

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;lt;/g, "<").replace(/&amp;gt;/g, ">")
    .replace(/&amp;laquo;/g, "«").replace(/&amp;raquo;/g, "»")
    .replace(/&amp;mdash;/g, "—").replace(/&amp;ndash;/g, "–")
    .replace(/&amp;nbsp;/g, " ").replace(/&amp;quot;/g, '"')
    .replace(/&amp;amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&laquo;/g, "«").replace(/&raquo;/g, "»")
    .replace(/&mdash;/g, "—").replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .trim();
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
  const slug = transliterate(str)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
  return `${slug}-ac-${externalId}`;
}

function parseDateMoscow(dateStr: string): Date | null {
  if (!dateStr) return null;
  // AdvCake format: "2026-03-31T19:00:00"
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  // If no timezone info, treat as Moscow
  if (!dateStr.includes("Z") && !dateStr.includes("+")) {
    return new Date(dateStr + "+03:00");
  }
  return d;
}

export function transformAdvCakeOffer(raw: RawAdvCakeOffer): TransformedEvent | null {
  if (!raw.id || !raw.name || !raw.region) return null;

  const citySlug = cityNameToSlug(raw.region);
  if (!citySlug) return null;

  const date = parseDateMoscow(raw.date);
  if (!date) return null;

  const isAvailable = raw.available !== "false";
  const price = isAvailable && raw.price ? parseFloat(raw.price) : null;

  const categorySourceId = raw.typePrefix
    ? mapCategoryToSourceId(raw.typePrefix)
    : "10";

  const description = raw.description ? decodeHtmlEntities(raw.description) : null;
  const place = raw.vendor || raw.model || null;

  const ageStr = typeof raw.age === "string" ? raw.age.replace(/[^0-9]/g, "") : "";
  const age = ageStr ? parseInt(ageStr, 10) : null;

  return {
    externalId: raw.id,
    citySlug,
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
    isKids: raw.typePrefix ? isKidsCategory(raw.typePrefix) : false,
    isPremiere: false,
    isAvailable,
    modifiedTime: null,
  };
}
