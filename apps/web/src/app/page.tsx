export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function HomePage() {
  const cities = await prisma.city.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-8 text-4xl font-bold">Куда сходить?</h1>
      <p className="mb-8 text-lg text-muted-foreground">
        Выберите ваш город
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {cities.map((city) => (
          <Link
            key={city.slug}
            href={`/${city.slug}`}
            className="rounded-lg border border-border px-4 py-3 text-center transition-colors hover:bg-secondary"
          >
            {city.name}
          </Link>
        ))}
      </div>
    </main>
  );
}
