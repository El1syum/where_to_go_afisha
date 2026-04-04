const SEARCH_URL = "https://music.yandex.ru/handlers/music-search.jsx";

interface YandexMusicArtist {
  id: number;
  name: string;
  coverUri: string | null;
  trackCount: number;
}

/**
 * Extract artist name from concert event title.
 * Removes venue in parentheses, text after "." or ":", common prefixes.
 */
export function extractArtistName(title: string, place: string | null): string | null {
  let name = title;

  // Remove venue in parentheses (exact match or at the end)
  if (place) {
    const escaped = place.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    name = name.replace(new RegExp(`\\s*\\(${escaped}\\)\\s*$`, "i"), "");
  }

  // Remove any remaining parenthesized suffix
  name = name.replace(/\s*\([^)]*\)\s*$/, "");

  // Take text before first "." or ":" (artist is usually before delimiter)
  name = name.replace(/[.:]\s+.*$/, "");

  // Remove common prefixes
  name = name
    .replace(/^Билеты на\s+/i, "")
    .replace(/^Концерт\s+/i, "")
    .replace(/^Шоу\s+/i, "");

  // Remove quotes
  name = name.replace(/[«»""„"]/g, "").trim();

  // Skip if too short/long
  if (name.length < 2 || name.length > 60) return null;

  // Skip generic/non-artist titles (\b doesn't work with Cyrillic in JS)
  const lower = name.toLowerCase();
  const skipWords = [
    "оркестр", "ансамбль", "хор ", "фестиваль", "при свечах",
    "саундтрек", "романтич", "джаз", "хиты", "сборник",
    "вечер ", "музыка", "абонемент", "органн", "симфони",
    "филармони", "день ", "ночь ", "песни", "песня", "рандеву",
  ];
  if (skipWords.some((w) => lower.includes(w))) return null;

  return name;
}

/**
 * Search Yandex Music for an artist by name.
 * Returns the best match if it has enough tracks (>= 3).
 */
export async function searchArtist(query: string): Promise<YandexMusicArtist | null> {
  try {
    const url = `${SEARCH_URL}?text=${encodeURIComponent(query)}&type=artist&lang=ru`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 86400 }, // cache for 24h
    });

    if (!res.ok) return null;

    const data = await res.json();
    const artists = data?.artists?.items;
    if (!Array.isArray(artists) || artists.length === 0) return null;

    // Take the first result — best match
    const artist = artists[0];
    if (!artist.id || !artist.name) return null;

    // Skip if too few tracks (probably not a real artist page)
    const trackCount = artist.counts?.tracks ?? 0;
    if (trackCount < 3) return null;

    // Loose name match: query should roughly match the artist name
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "");
    if (normalize(query) !== normalize(artist.name)) {
      // Allow if the artist name starts with the query or vice versa
      const nq = normalize(query);
      const na = normalize(artist.name);
      if (!na.startsWith(nq) && !nq.startsWith(na)) return null;
    }

    const coverUri = artist.cover?.uri || artist.ogImage || null;

    return {
      id: artist.id,
      name: artist.name,
      coverUri: coverUri ? `https://${coverUri.replace("%%", "200x200")}` : null,
      trackCount,
    };
  } catch {
    return null;
  }
}
