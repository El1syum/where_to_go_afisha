import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import { ChannelForm } from "@/components/admin/ChannelForm";
import { ChannelList } from "@/components/admin/ChannelList";

export default async function AdminChannelsPage() {
  await requireAdmin();

  const [channels, cities, categories, globalTemplateSetting] = await Promise.all([
    prisma.channel.findMany({
      orderBy: [{ cityId: "asc" }, { platform: "asc" }],
      include: {
        city: { select: { name: true, slug: true } },
        _count: { select: { posts: true } },
      },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, name: true },
    }),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true },
    }),
    prisma.setting.findUnique({ where: { key: "post_template" } }),
  ]);
  const globalTemplate = globalTemplateSetting?.value ?? null;

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Каналы публикации ({channels.length})</h1>
        <ChannelForm cities={cities} categories={categories} globalTemplate={globalTemplate} />
      </div>

      <ChannelList channels={channels} cities={cities} categories={categories} globalTemplate={globalTemplate} />
    </AdminShell>
  );
}
