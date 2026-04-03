import { PrismaClient } from "db";

export const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
  // @ts-ignore - Prisma supports connection_limit via URL or config
});
