import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: unknown): string {
  if (price == null) return "Бесплатно";
  const num = typeof price === "number" ? price : Number(price);
  if (isNaN(num) || num === 0) return "Бесплатно";
  return `от ${num.toLocaleString("ru-RU")} ₽`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  d.setDate(d.getDate() + 1);
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
 *
 * IMPORTANT: DB dates are shifted -1 day from real dates.
 * formatDate/formatDateTime add +1 day when displaying.
 * So "today" in real life corresponds to (today - 1 day) in the DB.
 *
 * @param dateFilter - one of: today, tomorrow, weekend, week, month
 * @param exactDate  - a specific date string in YYYY-MM-DD format (real-world date)
 * @returns Prisma where clause for the `date` field
 */
export function buildDateFilter(
  dateFilter?: string | null,
  exactDate?: string | null,
): { gte?: Date; lte?: Date; lt?: Date } | undefined {
  const now = new Date();

  // Helper: real date -> DB date (subtract 1 day)
  function toDbDate(d: Date): Date {
    const r = new Date(d);
    r.setDate(r.getDate() - 1);
    return r;
  }

  // Start of a day (00:00:00)
  function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // End of a day (23:59:59.999)
  function endOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  if (exactDate) {
    // User picked a specific real-world date
    const realDate = new Date(exactDate + "T00:00:00");
    const dbDate = toDbDate(realDate);
    return {
      gte: startOfDay(dbDate),
      lte: endOfDay(dbDate),
    };
  }

  if (!dateFilter) return undefined;

  const realToday = startOfDay(now);

  switch (dateFilter) {
    case "today": {
      const dbDay = toDbDate(new Date(realToday));
      return { gte: startOfDay(dbDay), lte: endOfDay(dbDay) };
    }
    case "tomorrow": {
      const realTomorrow = new Date(realToday);
      realTomorrow.setDate(realTomorrow.getDate() + 1);
      const dbDay = toDbDate(realTomorrow);
      return { gte: startOfDay(dbDay), lte: endOfDay(dbDay) };
    }
    case "weekend": {
      // Find next Saturday and Sunday (or current if today is Sat/Sun)
      const day = realToday.getDay(); // 0=Sun..6=Sat
      let satOffset: number;
      if (day === 6) satOffset = 0;       // today is Saturday
      else if (day === 0) satOffset = -1;  // today is Sunday, Saturday was yesterday
      else satOffset = 6 - day;

      const realSaturday = new Date(realToday);
      realSaturday.setDate(realSaturday.getDate() + satOffset);
      const realSunday = new Date(realSaturday);
      realSunday.setDate(realSunday.getDate() + 1);

      const dbSat = toDbDate(realSaturday);
      const dbSun = toDbDate(realSunday);
      return {
        gte: startOfDay(dbSat),
        lte: endOfDay(dbSun),
      };
    }
    case "week": {
      const realEnd = new Date(realToday);
      realEnd.setDate(realEnd.getDate() + 6);
      return {
        gte: startOfDay(toDbDate(new Date(realToday))),
        lte: endOfDay(toDbDate(realEnd)),
      };
    }
    case "month": {
      const realEnd = new Date(realToday);
      realEnd.setDate(realEnd.getDate() + 30);
      return {
        gte: startOfDay(toDbDate(new Date(realToday))),
        lte: endOfDay(toDbDate(realEnd)),
      };
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
