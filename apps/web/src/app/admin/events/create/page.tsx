import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import { EventForm } from "@/components/admin/EventForm";

export default async function CreateEventPage() {
  await requireAdmin();

  const [cities, categories] = await Promise.all([
    prisma.city.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, slug: true, name: true } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, name: true } }),
  ]);

  return (
    <AdminShell>
      <h1 className="mb-6 text-2xl font-bold">Добавить мероприятие</h1>
      <EventForm cities={cities} categories={categories} />
    </AdminShell>
  );
}
