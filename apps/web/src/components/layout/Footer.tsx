import Link from "next/link";
import { prisma } from "@/lib/db";

export async function Footer() {
  const cities = await prisma.city.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
    take: 20,
  });

  return (
    <footer className="mt-auto bg-[#1e1b3a]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div>
            <div className="text-lg font-bold text-indigo-400">Куда сходить?</div>
            <p className="mt-1 text-xs text-gray-400">
              Афиша мероприятий по городам России
            </p>
          </div>
        </div>

        {/* Cities grid */}
        {cities.length > 0 && (
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="mb-3 text-xs font-medium text-gray-500">Города</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-400">
              {cities.map((city) => (
                <Link key={city.slug} href={`/${city.slug}`} className="transition-colors hover:text-white">
                  {city.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-white/10 pt-4 text-xs text-gray-400">
          <Link href="/about" className="transition-colors hover:text-white">О проекте</Link>
          <Link href="/contacts" className="transition-colors hover:text-white">Контакты</Link>
          <Link href="/privacy" className="transition-colors hover:text-white">Политика конфиденциальности</Link>
        </div>
        <div className="mt-3 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Куда сходить? Все права защищены.
        </div>
      </div>
    </footer>
  );
}
