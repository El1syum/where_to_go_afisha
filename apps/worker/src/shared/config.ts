export const config = {
  database: {
    url: process.env.DATABASE_URL || "postgresql://afisha:afisha_password@localhost:5432/afisha",
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  xmlFeed: {
    url: process.env.XML_FEED_URL || "",
    cronSchedule: process.env.XML_CRON || "0 3 * * *", // daily at 03:00
    batchSize: 1000,
  },
  advcakeFeed: {
    url: process.env.ADVCAKE_FEED_URL || "",
    cronSchedule: process.env.ADVCAKE_CRON || "0 5 * * *", // daily at 05:00
    batchSize: 1000,
  },
  admitadFeed: {
    url: process.env.ADMITAD_FEED_URL || "",
    cronSchedule: process.env.ADMITAD_CRON || "0 7 * * *", // daily at 07:00
    batchSize: 1000,
  },
  kassirFeed: {
    url: process.env.KASSIR_FEED_URL || "",
    cronSchedule: process.env.KASSIR_CRON || "30 4 * * *", // daily at 04:30
    batchSize: 1000,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    cronSchedule: process.env.TG_CRON || "*/30 * * * *", // every 30 minutes
    postDelay: 3000, // ms between posts
    maxPostsPerRun: 10,
    daysAhead: 14,
  },
  max: {
    botToken: process.env.MAX_BOT_TOKEN || "",
  },
  cleanup: {
    cronSchedule: "0 2 * * *", // daily at 2:00 AM
  },
};
