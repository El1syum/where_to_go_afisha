import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminImportPage() {
  await requireAdmin();

  const imports = await prisma.importLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return (
    <AdminShell>
      <h1 className="mb-6 text-2xl font-bold">Импорт данных</h1>

      {/* Feed URL */}
      <div className="mb-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-2 text-sm font-semibold">URL XML-фида</h2>
        <code className="block break-all rounded-lg bg-secondary p-3 text-xs">
          {process.env.XML_FEED_URL || "Не настроен"}
        </code>
        <p className="mt-2 text-xs text-muted-foreground">
          Автоимпорт: ежедневно в 08:00. Настраивается через переменную XML_CRON.
        </p>
      </div>

      {/* Import history */}
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
                    {imp.startedAt.toLocaleString("ru-RU")}
                  </td>
                  <td className="px-4 py-3 text-xs">{imp.source}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      imp.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                      imp.status === "FAILED" ? "bg-red-100 text-red-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>{imp.status}</span>
                  </td>
                  <td className="px-4 py-3">{imp.totalItems}</td>
                  <td className="px-4 py-3 text-green-600">{imp.newItems}</td>
                  <td className="px-4 py-3 text-blue-600">{imp.updatedItems}</td>
                  <td className="px-4 py-3 text-muted-foreground">{imp.skippedItems}</td>
                  <td className="px-4 py-3 text-red-600">{imp.errorItems}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {imp.duration ? `${imp.duration}с` : "—"}
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
