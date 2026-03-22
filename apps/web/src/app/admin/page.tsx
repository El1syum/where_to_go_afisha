import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminDashboard() {
  await requireAdmin();

  const [
    totalEvents,
    activeEvents,
    totalCities,
    activeCities,
    totalCategories,
    recentImport,
    pendingTgPosts,
  ] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { isActive: true, isApproved: true, date: { gte: new Date() } } }),
    prisma.city.count(),
    prisma.city.count({ where: { isActive: true } }),
    prisma.category.count(),
    prisma.importLog.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.telegramPost.count({ where: { status: "PENDING" } }),
  ]);

  const stats = [
    { label: "Всего мероприятий", value: totalEvents.toLocaleString("ru-RU"), icon: "🎫" },
    { label: "Активных", value: activeEvents.toLocaleString("ru-RU"), icon: "✅" },
    { label: "Городов", value: `${activeCities} / ${totalCities}`, icon: "🏙️" },
    { label: "Категорий", value: totalCategories, icon: "📂" },
    { label: "В очереди TG", value: pendingTgPosts, icon: "📨" },
    {
      label: "Последний импорт",
      value: recentImport
        ? `${recentImport.status} — ${recentImport.startedAt.toLocaleDateString("ru-RU")}`
        : "Нет",
      icon: "📥",
    },
  ];

  // Top cities by event count
  const topCities = await prisma.city.findMany({
    where: { isActive: true },
    select: {
      name: true,
      slug: true,
      _count: { select: { events: { where: { isActive: true, date: { gte: new Date() } } } } },
    },
    orderBy: { events: { _count: "desc" } },
    take: 10,
  });

  return (
    <AdminShell>
      <h1 className="mb-6 text-2xl font-bold">Дашборд</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-1 text-2xl">{s.icon}</div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Топ городов по мероприятиям</h2>
        <div className="space-y-2">
          {topCities.map((city, i) => (
            <div key={city.slug} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-secondary/50">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-sm font-medium text-muted-foreground">{i + 1}</span>
                <span className="font-medium">{city.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">{city._count.events} мероприятий</span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
