import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { CategoryNav } from "@/components/layout/CategoryNav";
import { Footer } from "@/components/layout/Footer";
import { AdSidebar } from "@/components/ads/AdSidebar";
import { AdBottom } from "@/components/ads/AdBottom";

interface CityLayoutProps {
  children: React.ReactNode;
  params: Promise<{ city: string }>;
}

export default async function CityLayout({ children, params }: CityLayoutProps) {
  const { city: citySlug } = await params;

  const city = await prisma.city.findUnique({
    where: { slug: citySlug },
    select: { name: true, isActive: true },
  });

  if (!city || !city.isActive) {
    notFound();
  }

  const [cities, categories] = await Promise.all([
    prisma.city.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true, icon: true },
    }),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header cities={cities} currentCityName={city.name} />
      <CategoryNav categories={categories} />
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6">
        <main className="min-w-0 flex-1">
          {children}
        </main>
        <aside className="hidden w-[240px] shrink-0 lg:block">
          <AdSidebar />
        </aside>
      </div>
      <AdBottom />
      <Footer />
    </div>
  );
}
