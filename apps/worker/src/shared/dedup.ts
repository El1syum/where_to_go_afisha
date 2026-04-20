import { prisma } from "./db.js";
import { logger } from "./logger.js";

/**
 * Deactivate cross-source duplicate events.
 *
 * Two passes:
 *  1. Exact match: same normalized title + city + date (same day). Keeps the
 *     best source.
 *  2. Fuzzy match: same normalized title + city, dates within ±3 days.
 *     Different feeds sometimes report the same concert with slightly
 *     different dates (Kassir drift, Admitad shifts, Yandex inconsistencies).
 *     The lower-priority source gets deactivated.
 *
 * Priority: MANUAL > YANDEX_XML > EXTERNAL_API > ADVCAKE > ADMITAD
 */
export async function deduplicateEvents() {
  // Pass 1: exact same-day duplicates
  const exactDeactivated = await prisma.$executeRawUnsafe(`
    UPDATE "Event" SET "isActive" = false
    WHERE id IN (
      WITH normalized AS (
        SELECT id, source, "cityId", date::date as event_date,
          lower(trim(regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(title, '\\s*\\([^)]*\\)\\s*$', ''),
                '^\\s*(группа|виа|шоу|концерт|проект)\\s+', '', 'i'
              ),
              '[«»""''"„"‹›]+', '', 'g'
            ),
            'ё', 'е', 'g'
          ))) as norm_title
        FROM "Event"
        WHERE "isActive" = true AND date > now()
      ),
      ranked AS (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY norm_title, "cityId", event_date
            ORDER BY
              CASE source
                WHEN 'MANUAL' THEN 0
                WHEN 'YANDEX_XML' THEN 1
                WHEN 'EXTERNAL_API' THEN 2
                WHEN 'ADVCAKE' THEN 3
                WHEN 'ADMITAD' THEN 4
                ELSE 5
              END,
              id
          ) as rn
        FROM normalized
      )
      SELECT id FROM ranked WHERE rn > 1
    )
  `);

  // Pass 2: fuzzy match within ±3 days. Only consider groups of
  // same-title-same-city events with 2+ occurrences. Within each group,
  // build pairs (worse, better) where dates are within 3 days and worse
  // has lower priority (higher number). Deactivate the worse event.
  const fuzzyDeactivated = await prisma.$executeRawUnsafe(`
    UPDATE "Event" SET "isActive" = false
    WHERE id IN (
      WITH normalized AS (
        SELECT id, source, "cityId", date,
          CASE source
            WHEN 'MANUAL' THEN 0
            WHEN 'YANDEX_XML' THEN 1
            WHEN 'EXTERNAL_API' THEN 2
            WHEN 'ADVCAKE' THEN 3
            WHEN 'ADMITAD' THEN 4
            ELSE 5
          END as priority,
          lower(trim(regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(title, '\\s*\\([^)]*\\)\\s*$', ''),
                '^\\s*(группа|виа|шоу|концерт|проект)\\s+', '', 'i'
              ),
              '[«»""''"„"‹›]+', '', 'g'
            ),
            'ё', 'е', 'g'
          ))) as norm_title
        FROM "Event"
        WHERE "isActive" = true AND date > now()
      )
      SELECT DISTINCT a.id
      FROM normalized a
      JOIN normalized b ON a.norm_title = b.norm_title
        AND a."cityId" = b."cityId"
        AND a.id != b.id
        AND ABS(EXTRACT(EPOCH FROM (a.date - b.date))) <= 3 * 86400
        AND (a.priority > b.priority OR (a.priority = b.priority AND a.id > b.id))
    )
  `);

  const total = (typeof exactDeactivated === "number" ? exactDeactivated : 0) +
                (typeof fuzzyDeactivated === "number" ? fuzzyDeactivated : 0);
  logger.info(`Deduplication: exact=${exactDeactivated}, fuzzy=${fuzzyDeactivated}, total=${total}`);
  return total;
}
