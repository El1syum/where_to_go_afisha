import { extractArtistName, searchArtist } from "@/lib/yandex-music";

interface YandexMusicProps {
  title: string;
  place: string | null;
  categorySlug: string;
}

export async function YandexMusic({ title, place, categorySlug }: YandexMusicProps) {
  if (categorySlug !== "concerts") return null;

  const artistName = extractArtistName(title, place);
  if (!artistName) return null;

  const artist = await searchArtist(artistName);
  if (!artist) return null;

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">
        Слушать {artist.name} на Яндекс Музыке
      </h2>
      <div className="overflow-hidden rounded-2xl border border-gray-200">
        <iframe
          src={`https://music.yandex.ru/iframe/artist/${artist.id}/`}
          width="100%"
          height="300"
          frameBorder="0"
          allow="autoplay; encrypted-media"
          loading="lazy"
          className="block"
          title={`${artist.name} — Яндекс Музыка`}
        />
      </div>
      <a
        href={`https://music.yandex.ru/artist/${artist.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        Открыть в Яндекс Музыке →
      </a>
    </div>
  );
}
