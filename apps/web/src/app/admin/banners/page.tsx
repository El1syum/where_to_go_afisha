import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import { BannersEditor } from "@/components/admin/BannersEditor";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  await requireAdmin();

  const settings = await prisma.setting.findMany({
    where: { key: { in: ["banner_url_1", "banner_url_2", "banner_url_3", "banner_url_4", "banner_url_5"] } },
    select: { key: true, value: true },
  });

  const initial: (string | null)[] = [1, 2, 3, 4, 5].map(
    (i) => settings.find((s) => s.key === `banner_url_${i}`)?.value || null
  );

  return (
    <AdminShell>
      <h1 className="mb-6 text-2xl font-bold">Баннеры</h1>
      <BannersEditor initial={initial} />
    </AdminShell>
  );
}
