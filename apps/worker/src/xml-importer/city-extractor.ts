/**
 * Извлекает slug города из партнёрской ссылки bednari.com.
 * URL формат: https://bednari.com/g/.../?...&ulp=https%3A%2F%2Fafisha.yandex.ru%2F{city_slug}%2F...
 */
export function extractCitySlug(affiliateUrl: string): string | null {
  try {
    const url = new URL(affiliateUrl);
    const ulp = url.searchParams.get("ulp");
    if (!ulp) return null;

    const decoded = decodeURIComponent(ulp);
    const yandexUrl = new URL(decoded);
    const parts = yandexUrl.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;

    return parts[0]; // city slug
  } catch {
    return null;
  }
}

/**
 * Извлекает оригинальную ссылку на afisha.yandex.ru из партнёрского URL.
 */
export function extractOriginalUrl(affiliateUrl: string): string | null {
  try {
    const url = new URL(affiliateUrl);
    const ulp = url.searchParams.get("ulp");
    if (!ulp) return null;
    return decodeURIComponent(ulp);
  } catch {
    return null;
  }
}
