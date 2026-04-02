import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import { CityToggle } from "@/components/admin/CityToggle";
import { CityEditForm } from "@/components/admin/CityEditForm";

export default async function AdminCitiesPage() {
  await requireAdmin();

  const cities = await prisma.city.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      namePrepositional: true,
      isActive: true,
      sortOrder: true,
      telegramChannelId: true,
      seoText: true,
      _count: { select: { events: true } },
    },
  });

  return (
    <AdminShell>
      <h1 className="mb-6 text-2xl font-bold">Города ({cities.length})</h1>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left font-medium">Активен</th>
              <th className="px-4 py-3 text-left font-medium">Slug</th>
              <th className="px-4 py-3 text-left font-medium">Название</th>
              <th className="px-4 py-3 text-left font-medium">В предложном</th>
              <th className="px-4 py-3 text-left font-medium">Мероприятий</th>
              <th className="px-4 py-3 text-left font-medium">TG канал</th>
              <th className="px-4 py-3 text-left font-medium">Порядок</th>
              <th className="px-4 py-3 text-left font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((city) => (
              <tr key={city.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                <td className="px-4 py-3">
                  <CityToggle cityId={city.id} isActive={city.isActive} />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{city.slug}</td>
                <td className="px-4 py-3 font-medium">{city.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{city.namePrepositional || "—"}</td>
                <td className="px-4 py-3">{city._count.events}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{city.telegramChannelId || "—"}</td>
                <td className="px-4 py-3">{city.sortOrder}</td>
                <td className="px-4 py-3">
                  <CityEditForm city={city} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
