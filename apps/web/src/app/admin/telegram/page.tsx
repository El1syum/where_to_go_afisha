import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import { CityEditForm } from "@/components/admin/CityEditForm";
import { GlobalTemplateEditor } from "@/components/admin/GlobalTemplateEditor";

export default async function AdminTelegramPage() {
  await requireAdmin();

  const globalTemplate = await prisma.setting.findUnique({ where: { key: "post_template" } });

  const cities = await prisma.city.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true, slug: true, name: true, namePrepositional: true,
      isActive: true, sortOrder: true, telegramChannelId: true,
    },
  });

  const recentPosts = await prisma.telegramPost.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      event: { select: { title: true } },
      city: { select: { name: true } },
    },
  });

  const citiesWithChannel = cities.filter((c) => c.telegramChannelId);
  const citiesWithoutChannel = cities.filter((c) => !c.telegramChannelId);

  return (
    <AdminShell>
      <h1 className="mb-6 text-2xl font-bold">Telegram</h1>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-2xl font-bold">{citiesWithChannel.length}</div>
          <div className="text-xs text-muted-foreground">Городов с каналом</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-2xl font-bold">{citiesWithoutChannel.length}</div>
          <div className="text-xs text-muted-foreground">Без канала</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-2xl font-bold">{recentPosts.filter((p) => p.status === "SENT").length}</div>
          <div className="text-xs text-muted-foreground">Отправлено (посл. 20)</div>
        </div>
      </div>

      {/* Global template */}
      <div className="mb-8">
        <GlobalTemplateEditor initialTemplate={globalTemplate?.value ?? null} />
      </div>

      {/* Cities with channels */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Привязанные каналы</h2>
        {citiesWithChannel.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет привязанных каналов. Настройте через раздел "Города".</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-4 py-3 text-left font-medium">Город</th>
                  <th className="px-4 py-3 text-left font-medium">Channel ID</th>
                  <th className="px-4 py-3 text-left font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {citiesWithChannel.map((city) => (
                  <tr key={city.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{city.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{city.telegramChannelId}</td>
                    <td className="px-4 py-3">
                      <CityEditForm city={city} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent posts */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Последние публикации</h2>
        {recentPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Публикаций пока нет.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-4 py-3 text-left font-medium">Мероприятие</th>
                  <th className="px-4 py-3 text-left font-medium">Город</th>
                  <th className="px-4 py-3 text-left font-medium">Статус</th>
                  <th className="px-4 py-3 text-left font-medium">Дата</th>
                </tr>
              </thead>
              <tbody>
                {recentPosts.map((post) => (
                  <tr key={post.id} className="border-b border-border last:border-0">
                    <td className="max-w-xs truncate px-4 py-3">{post.event.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{post.city.name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        post.status === "SENT" ? "bg-green-100 text-green-800" :
                        post.status === "FAILED" ? "bg-red-100 text-red-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>{post.status}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {post.createdAt.toLocaleDateString("ru-RU")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
