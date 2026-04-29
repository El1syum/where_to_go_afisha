import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: unknown, isAvailable: boolean = true): string {
  if (!isAvailable) return "Уточняйте при покупке";
  if (price == null || price === "") return "Бесплатно";
  const num = typeof price === "number" ? price : Number(price);
  if (isNaN(num) || num === 0) return "Бесплатно";
  return `от ${num.toLocaleString("ru-RU")} ₽`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function transliterate(str: string): string {
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
    .map((char) => map[char] ?? char)
    .join("");
}

/**
 * Builds a Prisma `date` filter based on the date filter key or exact date.
 * DB dates now store real dates directly (no offset).
 */
export function buildDateFilter(
  dateFilter?: string | null,
  exactDate?: string | null,
): { gte?: Date; lte?: Date; lt?: Date } | undefined {
  const now = new Date();

  function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function endOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  if (exactDate) {
    const d = new Date(exactDate + "T00:00:00");
    return { gte: startOfDay(d), lte: endOfDay(d) };
  }

  if (!dateFilter) return undefined;

  const today = startOfDay(now);

  switch (dateFilter) {
    case "today":
      return { gte: startOfDay(today), lte: endOfDay(today) };
    case "tomorrow": {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { gte: startOfDay(tomorrow), lte: endOfDay(tomorrow) };
    }
    case "weekend": {
      const day = today.getDay();
      let satOffset: number;
      if (day === 6) satOffset = 0;
      else if (day === 0) satOffset = -1;
      else satOffset = 6 - day;
      const sat = new Date(today);
      sat.setDate(sat.getDate() + satOffset);
      const sun = new Date(sat);
      sun.setDate(sun.getDate() + 1);
      return { gte: startOfDay(sat), lte: endOfDay(sun) };
    }
    case "week": {
      const end = new Date(today);
      end.setDate(end.getDate() + 6);
      return { gte: startOfDay(today), lte: endOfDay(end) };
    }
    case "month": {
      const end = new Date(today);
      end.setDate(end.getDate() + 30);
      return { gte: startOfDay(today), lte: endOfDay(end) };
    }
    default:
      return undefined;
  }
}

/**
 * Builds Prisma price filter conditions from price range key.
 * Returns array of AND conditions to push into query.
 */
export function buildPriceFilter(priceKey?: string | null): unknown[] {
  if (!priceKey) return [];
  switch (priceKey) {
    case "0-1000":
      return [{ price: { gt: 0 } }, { price: { lte: 1000 } }];
    case "1000-2000":
      return [{ price: { gt: 1000 } }, { price: { lte: 2000 } }];
    case "2000-4000":
      return [{ price: { gt: 2000 } }, { price: { lte: 4000 } }];
    case "4000+":
      return [{ price: { gt: 4000 } }];
    default:
      return [];
  }
}

/**
 * Interleave events by category: each consecutive event should be
 * from a different category. Within each category, events are sorted
 * by price desc (most expensive first), then by date asc.
 */
export function interleaveByCategory<T extends { category: { slug: string }; price: unknown; date: Date | string }>(
  events: T[]
): T[] {
  if (events.length <= 1) return events;

  // Group by category, sort each group by price desc then date asc
  const groups = new Map<string, T[]>();
  for (const e of events) {
    const key = e.category.slug;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  // Sort each group: expensive first, then nearest date
  for (const arr of groups.values()) {
    arr.sort((a, b) => {
      const pa = Number(a.price) || 0;
      const pb = Number(b.price) || 0;
      if (pb !== pa) return pb - pa;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }

  // Pick most expensive from a different category each step
  const result: T[] = [];
  let lastSlug = "";

  while (result.length < events.length) {
    let bestQueue: T[] | null = null;
    let bestPrice = -1;

    for (const q of groups.values()) {
      if (q.length === 0) continue;
      if (q[0].category.slug === lastSlug) continue;
      const p = Number(q[0].price) || 0;
      if (p > bestPrice) { bestPrice = p; bestQueue = q; }
    }

    if (!bestQueue) {
      for (const q of groups.values()) {
        if (q.length > 0) { bestQueue = q; break; }
      }
    }

    if (!bestQueue) break;
    const item = bestQueue.shift()!;
    result.push(item);
    lastSlug = item.category.slug;
  }

  return result;
}

export function slugify(str: string): string {
  return transliterate(str)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 120);
}
