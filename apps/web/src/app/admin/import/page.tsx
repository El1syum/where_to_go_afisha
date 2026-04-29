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

const FEED_SCHEDULE: Record<string, string> = {
  YANDEX_XML: "03:00",
  EXTERNAL_API: "04:30",
  ADVCAKE: "05:00",
  ADMITAD: "07:00",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}с`;
  return `${Math.floor(seconds / 60)}м ${seconds % 60}с`;
}

export default async function AdminImportPage() {
  await requireAdmin();

  const now = new Date();

  // Events by source
  const eventsBySource = await prisma.event.groupBy({
    by: ["source"],
    where: { isActive: true, date: { gte: now } },
    _count: true,
  });

  // Import logs
  const imports = await prisma.importLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  // Last successful per source
  const lastSuccess = new Map<string, typeof imports[0]>();
  for (const log of imports) {
    if (log.status === "COMPLETED" && !lastSuccess.has(log.source)) {
      lastSuccess.set(log.source, log);
    }
  }

  const sources = ["YANDEX_XML", "EXTERNAL_API", "ADVCAKE", "ADMITAD"];

  return (
    <AdminShell>
      <h1 className="mb-6 text-2xl font-bold">Импорт данных</h1>

      {/* Feed overview */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sources.map((source) => {
          const count = eventsBySource.find((e) => e.source === source)?._count || 0;
          const last = lastSuccess.get(source);
          return (
            <div key={source} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-1 text-sm font-semibold">{SOURCE_LABELS[source]}</div>
              <div className="text-2xl font-bold">{count.toLocaleString("ru-RU")}</div>
              <div className="text-xs text-muted-foreground">активных событий</div>
              <div className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                {last ? (
                  <>
                    Последний: {last.startedAt.toLocaleDateString("ru-RU")}
                    {last.newItems ? <span className="ml-1 text-green-600">+{last.newItems.toLocaleString("ru-RU")}</span> : null}
                    {last.duration ? <span className="ml-1">({formatDuration(last.duration)})</span> : null}
                  </>
                ) : "Ещё не запускался"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Крон: ежедневно в {FEED_SCHEDULE[source] || "—"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Import history */}
      <h2 className="mb-3 text-lg font-semibold">История импортов</h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left font-medium">Дата</th>
              <th className="px-4 py-3 text-left font-medium">Источник</th>
              <th className="px-4 py-3 text-left font-medium">Статус</th>
              <th className="px-4 py-3 text-left font-medium">Всего</th>
              <th className="px-4 py-3 text-left font-medium">Новых</th>
              <th className="px-4 py-3 text-left font-medium">Обновлено</th>
              <th className="px-4 py-3 text-left font-medium">Пропущено</th>
              <th className="px-4 py-3 text-left font-medium">Ошибок</th>
              <th className="px-4 py-3 text-left font-medium">Время</th>
            </tr>
          </thead>
          <tbody>
            {imports.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  Импортов пока не было
                </td>
              </tr>
            ) : (
              imports.map((imp) => (
                <tr key={imp.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    {imp.startedAt.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium">{SOURCE_LABELS[imp.source] || imp.source}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      imp.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                      imp.status === "FAILED" ? "bg-red-100 text-red-800" :
                      imp.status === "RUNNING" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-600"
                    }`}>{imp.status}</span>
                  </td>
                  <td className="px-4 py-3">{imp.totalItems.toLocaleString("ru-RU")}</td>
                  <td className="px-4 py-3 text-green-600">{imp.newItems ? `+${imp.newItems.toLocaleString("ru-RU")}` : "0"}</td>
                  <td className="px-4 py-3 text-blue-600">{imp.updatedItems?.toLocaleString("ru-RU") || "0"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{imp.skippedItems?.toLocaleString("ru-RU") || "0"}</td>
                  <td className="px-4 py-3 text-red-600">{imp.errorItems || "0"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {formatDuration(imp.duration)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
