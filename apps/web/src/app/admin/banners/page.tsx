import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import { BannersEditor } from "@/components/admin/BannersEditor";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  await requireAdmin();

  const [banners, cities] = await Promise.all([
    prisma.banner.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: { city: { select: { id: true, slug: true, name: true } } },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AdminShell>
      <h1 className="mb-6 text-2xl font-bold">Баннеры</h1>
      <BannersEditor initial={banners} cities={cities} />
    </AdminShell>
  );
}
