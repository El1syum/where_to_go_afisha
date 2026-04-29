import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";

const SOURCE_LABELS: Record<string, string> = {
  YANDEX_XML: "Яндекс Афиша",
  EXTERNAL_API: "Кассир.ру",
  ADVCAKE: "AdvCake (Ticketland)",
  ADMITAD: "Admitad (Afisha.ru)",
  MANUAL: "Вручную",
};

export default async function AdminDashboard() {
  await requireAdmin();

  const now = new Date();

  const [
    totalEvents,
    activeEvents,
    totalCities,
    activeCities,
    totalCategories,
    pendingTgPosts,
    channelCount,
  ] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { isActive: true, isApproved: true, date: { gte: now } } }),
    prisma.city.count(),
    prisma.city.count({ where: { isActive: true } }),
    prisma.category.count(),
    prisma.telegramPost.count({ where: { status: "PENDING" } }),
    prisma.channel.count({ where: { isActive: true } }),
  ]);

  // Events by source
  const eventsBySource = await prisma.event.groupBy({
    by: ["source"],
    where: { isActive: true, date: { gte: now } },
    _count: true,
  });

  // Import logs — last per source
  const importLogs = await prisma.importLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  const lastImportBySource = new Map<string, typeof importLogs[0]>();
  for (const log of importLogs) {
    if (!lastImportBySource.has(log.source)) {
      lastImportBySource.set(log.source, log);
    }
  }

  const stats = [
    { label: "Всего мероприятий", value: totalEvents.toLocaleString("ru-RU"), icon: "🎫" },
    { label: "Активных", value: activeEvents.toLocaleString("ru-RU"), icon: "✅" },
    { label: "Городов", value: `${activeCities} / ${totalCities}`, icon: "🏙️" },
    { label: "Категорий", value: totalCategories, icon: "📂" },
    { label: "Каналов", value: channelCount, icon: "📡" },
    { label: "В очереди TG", value: pendingTgPosts, icon: "📨" },
  ];

  // Top cities
  const topCities = await prisma.city.findMany({
    where: { isActive: true },
    select: {
      name: true,
      slug: true,
      _count: { select: { events: { where: { isActive: true, date: { gte: now } } } } },
    },
    orderBy: { events: { _count: "desc" } },
    take: 10,
  });

  return (
    <AdminShell>
      <h1 className="mb-6 text-2xl font-bold">Дашборд</h1>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-1 text-2xl">{s.icon}</div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Import stats */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Фиды и импорт</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium">Источник</th>
                <th className="px-4 py-3 text-left font-medium">Событий</th>
                <th className="px-4 py-3 text-left font-medium">Последний импорт</th>
                <th className="px-4 py-3 text-left font-medium">Статус</th>
                <th className="px-4 py-3 text-left font-medium">Новых</th>
                <th className="px-4 py-3 text-left font-medium">Обновлено</th>
                <th className="px-4 py-3 text-left font-medium">Ошибок</th>
                <th className="px-4 py-3 text-left font-medium">Время</th>
              </tr>
            </thead>
            <tbody>
              {["YANDEX_XML", "EXTERNAL_API", "ADVCAKE", "ADMITAD", "MANUAL"].map((source) => {
                const count = eventsBySource.find((e) => e.source === source)?._count || 0;
                const log = lastImportBySource.get(source);
                return (
                  <tr key={source} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{SOURCE_LABELS[source] || source}</td>
                    <td className="px-4 py-3">{count.toLocaleString("ru-RU")}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {log ? log.startedAt.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {log ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                          log.status === "RUNNING" ? "bg-blue-100 text-blue-800" :
                          log.status === "FAILED" ? "bg-red-100 text-red-800" :
                          "bg-gray-100 text-gray-600"
                        }`}>{log.status}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-green-600">{log?.newItems ? `+${log.newItems.toLocaleString("ru-RU")}` : "—"}</td>
                    <td className="px-4 py-3">{log?.updatedItems?.toLocaleString("ru-RU") || "—"}</td>
                    <td className="px-4 py-3 text-red-500">{log?.errorItems || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {log?.duration ? `${Math.floor(log.duration / 60)}м ${log.duration % 60}с` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top cities */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Топ городов по мероприятиям</h2>
        <div className="space-y-2">
          {topCities.map((city, i) => (
            <div key={city.slug} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-secondary/50">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-sm font-medium text-muted-foreground">{i + 1}</span>
                <span className="font-medium">{city.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">{city._count.events.toLocaleString("ru-RU")} мероприятий</span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
