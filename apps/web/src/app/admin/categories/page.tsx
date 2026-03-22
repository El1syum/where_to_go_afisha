import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import { ToggleSwitch } from "@/components/admin/ToggleSwitch";

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true, slug: true, name: true, icon: true,
      sourceId: true, sortOrder: true, isActive: true,
      _count: { select: { events: true } },
    },
  });

  return (
    <AdminShell>
      <h1 className="mb-6 text-2xl font-bold">Категории</h1>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left font-medium">Активна</th>
              <th className="px-4 py-3 text-left font-medium">Иконка</th>
              <th className="px-4 py-3 text-left font-medium">Название</th>
              <th className="px-4 py-3 text-left font-medium">Slug</th>
              <th className="px-4 py-3 text-left font-medium">Source ID</th>
              <th className="px-4 py-3 text-left font-medium">Мероприятий</th>
              <th className="px-4 py-3 text-left font-medium">Порядок</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                <td className="px-4 py-3">
                  <ToggleSwitch apiUrl={`/api/admin/categories/${cat.id}`} isActive={cat.isActive} />
                </td>
                <td className="px-4 py-3 text-xl">{cat.icon || "—"}</td>
                <td className="px-4 py-3 font-medium">{cat.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{cat.slug}</td>
                <td className="px-4 py-3 text-muted-foreground">{cat.sourceId}</td>
                <td className="px-4 py-3">{cat._count.events}</td>
                <td className="px-4 py-3">{cat.sortOrder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
