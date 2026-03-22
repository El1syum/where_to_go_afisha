import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_CITY = "moscow";

// Маппинг русских названий городов → slug (для GeoIP)
const CITY_NAME_MAP: Record<string, string> = {
  "москва": "moscow",
  "санкт-петербург": "saint-petersburg",
  "екатеринбург": "yekaterinburg",
  "новосибирск": "novosibirsk",
  "казань": "kazan",
  "красноярск": "krasnoyarsk",
  "нижний новгород": "nizhny-novgorod",
  "пермь": "perm",
  "ростов-на-дону": "rostov-na-donu",
  "краснодар": "krasnodar",
  "самара": "samara",
  "воронеж": "voronezh",
  "уфа": "ufa",
  "волгоград": "volgograd",
  "челябинск": "chelyabinsk",
  "омск": "omsk",
  "тюмень": "tyumen",
  "калининград": "kaliningrad",
  "ярославль": "yaroslavl",
  "сочи": "sochi",
  "тула": "tula",
  "иркутск": "irkutsk",
  "томск": "tomsk",
  "владивосток": "vladivostok",
  "саратов": "saratov",
  "хабаровск": "khabarovsk",
  "тверь": "tver",
  "барнаул": "barnaul",
  "рязань": "ryazan",
  "ижевск": "izhevsk",
  "симферополь": "simferopol",
  "севастополь": "sevastopol",
  "кемерово": "kemerovo",
  "оренбург": "orenburg",
  "пенза": "penza",
  "курск": "kursk",
  "астрахань": "astrakhan",
};

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "";

  let detectedSlug = DEFAULT_CITY;

  // Try free GeoIP service
  try {
    const targetIp = ip && ip !== "127.0.0.1" && ip !== "::1" ? ip : "";
    const geoUrl = targetIp
      ? `http://ip-api.com/json/${targetIp}?lang=ru&fields=city,status`
      : `http://ip-api.com/json/?lang=ru&fields=city,status`;

    const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(3000) });
    const geoData = await geoRes.json();

    if (geoData.status === "success" && geoData.city) {
      const cityLower = geoData.city.toLowerCase();

      // Try direct mapping
      if (CITY_NAME_MAP[cityLower]) {
        detectedSlug = CITY_NAME_MAP[cityLower];
      } else {
        // Try finding in DB by name
        const dbCity = await prisma.city.findFirst({
          where: {
            isActive: true,
            name: { equals: geoData.city, mode: "insensitive" },
          },
          select: { slug: true },
        });
        if (dbCity) {
          detectedSlug = dbCity.slug;
        }
      }
    }
  } catch {
    // GeoIP failed, use default
  }

  // Verify city exists in DB
  const city = await prisma.city.findUnique({
    where: { slug: detectedSlug },
    select: { slug: true, name: true, isActive: true },
  });

  if (!city || !city.isActive) {
    detectedSlug = DEFAULT_CITY;
    const fallback = await prisma.city.findUnique({
      where: { slug: DEFAULT_CITY },
      select: { slug: true, name: true },
    });
    return NextResponse.json({
      city: DEFAULT_CITY,
      cityName: fallback?.name || "Москва",
    });
  }

  return NextResponse.json({
    city: city.slug,
    cityName: city.name,
  });
}
