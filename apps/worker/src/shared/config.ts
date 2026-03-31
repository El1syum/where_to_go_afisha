export const config = {
  database: {
    url: process.env.DATABASE_URL || "postgresql://afisha:afisha_password@localhost:5432/afisha",
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  xmlFeed: {
    url: process.env.XML_FEED_URL || "",
    cronSchedule: process.env.XML_CRON || "0 8 * * *", // daily at 08:00
    batchSize: 500,
  },
  advcakeFeed: {
    url: process.env.ADVCAKE_FEED_URL || "",
    cronSchedule: process.env.ADVCAKE_CRON || "0 9 * * *", // daily at 09:00
    batchSize: 500,
  },
  admitadFeed: {
    url: process.env.ADMITAD_FEED_URL || "",
    cronSchedule: process.env.ADMITAD_CRON || "0 10 * * *", // daily at 10:00
    batchSize: 500,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    cronSchedule: process.env.TG_CRON || "*/30 * * * *", // every 30 minutes
    postDelay: 3000, // ms between posts
    maxPostsPerRun: 10,
    daysAhead: 14,
  },
  cleanup: {
    cronSchedule: "0 3 * * *", // daily at 3:00 AM
  },
};
