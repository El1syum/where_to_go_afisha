import { prisma } from "./db.js";
import { logger } from "./logger.js";

/**
 * Deactivate cross-source duplicate events.
 * Groups by normalized title + city + date (same day), keeps the best source.
 * Priority: MANUAL > YANDEX_XML > EXTERNAL_API > ADVCAKE > ADMITAD
 */
export async function deduplicateEvents() {
  const deactivated = await prisma.$executeRawUnsafe(`
    UPDATE "Event" SET "isActive" = false
    WHERE id IN (
      WITH normalized AS (
        SELECT id, source, "cityId", date::date as event_date,
          lower(trim(regexp_replace(
            regexp_replace(title, '\\s*\\([^)]*\\)\\s*$', ''),
            '[«»""]+', '', 'g'
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

  logger.info(`Deduplication: deactivated ${deactivated} duplicate events`);
  return typeof deactivated === "number" ? deactivated : 0;
}
