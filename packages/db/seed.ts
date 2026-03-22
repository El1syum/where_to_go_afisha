import { PrismaClient } from "@prisma/client";
import { hash } from "crypto";

const prisma = new PrismaClient();

const CATEGORIES = [
  { sourceId: "1", slug: "films", name: "Фильмы", icon: "🎬", sortOrder: 1 },
  { sourceId: "2", slug: "concerts", name: "Концерты", icon: "🎵", sortOrder: 2 },
  { sourceId: "3", slug: "theatre", name: "Театр", icon: "🎭", sortOrder: 3 },
  { sourceId: "4", slug: "exhibitions", name: "Выставки", icon: "🖼️", sortOrder: 4 },
  { sourceId: "5", slug: "lectures", name: "Лекции", icon: "🎓", sortOrder: 5 },
  { sourceId: "6", slug: "quests", name: "Квесты", icon: "🔍", sortOrder: 6 },
  { sourceId: "7", slug: "sport", name: "Спорт", icon: "⚽", sortOrder: 7 },
  { sourceId: "8", slug: "excursions", name: "Экскурсии", icon: "🗺️", sortOrder: 8 },
  { sourceId: "9", slug: "standup", name: "Стендап", icon: "🎤", sortOrder: 9 },
  { sourceId: "10", slug: "events", name: "События", icon: "🎉", sortOrder: 10 },
];

async function hashPassword(password: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("Seeding categories...");
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, sourceId: cat.sourceId, sortOrder: cat.sortOrder },
      create: cat,
    });
  }
  console.log(`  Created ${CATEGORIES.length} categories`);

  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await hashPassword(adminPassword);

  console.log("Seeding admin user...");
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: "Admin",
      role: "ADMIN",
    },
  });
  console.log(`  Admin user: ${adminEmail}`);

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
