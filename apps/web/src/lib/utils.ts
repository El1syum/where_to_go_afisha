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
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
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

export function slugify(str: string): string {
  return transliterate(str)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 120);
}
