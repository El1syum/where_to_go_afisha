import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import { GlobalTemplateEditor } from "@/components/admin/GlobalTemplateEditor";

export default async function AdminTelegramPage() {
  await requireAdmin();

  const globalTemplate = await prisma.setting.findUnique({ where: { key: "post_template" } });

  const channels = await prisma.channel.findMany({
    where: { platform: "TELEGRAM" },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { city: { select: { name: true } } },
  });

  // Count sent posts per channel
  const postCounts = await prisma.telegramPost.groupBy({
    by: ["channelDbId"],
    where: { status: "SENT" },
    _count: true,
  });
  const postCountMap = new Map(postCounts.map((p) => [p.channelDbId, p._count]));

  const activeCities = await prisma.city.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const cityIdsWithChannel = new Set(channels.map((c) => c.cityId));
  const citiesWithoutChannel = activeCities.filter((c) => !cityIdsWithChannel.has(c.id));

  const recentPosts = await prisma.telegramPost.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      event: { select: { title: true } },
      city: { select: { name: true } },
    },
  });

  const sentCount = recentPosts.filter((p) => p.status === "SENT").length;

  return (
    <AdminShell>
      <h1 className="mb-6 text-2xl font-bold">Telegram</h1>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-2xl font-bold">{channels.length}</div>
          <div className="text-xs text-muted-foreground">Каналов</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-2xl font-bold">{channels.filter((c) => c.isActive).length}</div>
          <div className="text-xs text-muted-foreground">Активных</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-2xl font-bold">{citiesWithoutChannel.length}</div>
          <div className="text-xs text-muted-foreground">Городов без канала</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-2xl font-bold">{sentCount}</div>
          <div className="text-xs text-muted-foreground">Отправлено (посл. 30)</div>
        </div>
      </div>

      {/* Global template */}
      <div className="mb-8">
        <GlobalTemplateEditor initialTemplate={globalTemplate?.value ?? null} />
      </div>

      {/* Channels list */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Каналы ({channels.length})</h2>
        {channels.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет каналов. Создайте через раздел "Каналы".</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-4 py-3 text-left font-medium">Канал</th>
                  <th className="px-4 py-3 text-left font-medium">Город</th>
                  <th className="px-4 py-3 text-left font-medium">Channel ID</th>
                  <th className="px-4 py-3 text-left font-medium">Опубликовано</th>
                  <th className="px-4 py-3 text-left font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((ch) => (
                  <tr key={ch.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{ch.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ch.city.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{ch.channelId}</td>
                    <td className="px-4 py-3">{postCountMap.get(ch.id) ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ch.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      }`}>
                        {ch.isActive ? "Активен" : "Выкл"}
                      </span>
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
