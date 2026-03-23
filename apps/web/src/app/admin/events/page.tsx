import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { EventActions } from "@/components/admin/EventActions";
import { PublishButton } from "@/components/admin/PublishButton";

const PAGE_SIZE = 30;

interface Props {
  searchParams: Promise<{
    page?: string;
    city?: string;
    category?: string;
    q?: string;
    status?: string;
  }>;
}

export default async function AdminEventsPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const cityFilter = params.city || "";
  const categoryFilter = params.category || "";
  const search = params.q || "";
  const statusFilter = params.status || "";

  const where: Record<string, unknown> = {};
  if (cityFilter) {
    const city = await prisma.city.findUnique({ where: { slug: cityFilter }, select: { id: true } });
    if (city) where.cityId = city.id;
  }
  if (categoryFilter) {
    const cat = await prisma.category.findUnique({ where: { slug: categoryFilter }, select: { id: true } });
    if (cat) where.categoryId = cat.id;
  }
  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }
  if (statusFilter === "active") {
    where.isActive = true;
    where.isApproved = true;
  } else if (statusFilter === "inactive") {
    where.isActive = false;
  }

  const [events, total, cities, categories, allChannels] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        city: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        telegramPosts: { select: { channelDbId: true, status: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.event.count({ where }),
    prisma.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    prisma.channel.findMany({ where: { isActive: true }, select: { id: true, name: true, platform: true, channelId: true, isActive: true, cityId: true } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildUrl(overrides: Record<string, string>) {
    const p = { page: String(page), city: cityFilter, category: categoryFilter, q: search, status: statusFilter, ...overrides };
    const qs = Object.entries(p).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    return `/admin/events${qs ? `?${qs}` : ""}`;
  }

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мероприятия ({total})</h1>
      </div>

      {/* Filters */}
      <form className="mb-6 flex flex-wrap items-end gap-3" method="GET">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Поиск</label>
          <input name="q" defaultValue={search} placeholder="Название..." className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Город</label>
          <select name="city" defaultValue={cityFilter} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">Все</option>
            {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Категория</label>
          <select name="category" defaultValue={categoryFilter} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">Все</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Статус</label>
          <select name="status" defaultValue={statusFilter} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">Все</option>
            <option value="active">Активные</option>
            <option value="inactive">Неактивные</option>
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Найти</button>
        <Link href="/admin/events" className="rounded-lg border border-border px-4 py-2 text-sm">Сбросить</Link>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left font-medium">Название</th>
              <th className="px-4 py-3 text-left font-medium">Город</th>
              <th className="px-4 py-3 text-left font-medium">Категория</th>
              <th className="px-4 py-3 text-left font-medium">Дата</th>
              <th className="px-4 py-3 text-left font-medium">Цена</th>
              <th className="px-4 py-3 text-left font-medium">Статус</th>
              <th className="px-4 py-3 text-left font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                <td className="max-w-xs truncate px-4 py-3 font-medium">{event.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{event.city.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{event.category.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(event.date)}</td>
                <td className="px-4 py-3">{event.price ? `${Number(event.price)} ₽` : "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${event.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {event.isActive ? "Активно" : "Скрыто"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <EventActions eventId={event.id} isActive={event.isActive} />
                    <PublishButton
                      eventId={event.id}
                      channels={allChannels.filter(ch => ch.cityId === event.cityId)}
                      publishedChannelIds={event.telegramPosts.filter(p => p.status === "SENT" && p.channelDbId).map(p => p.channelDbId!)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={buildUrl({ page: String(page - 1) })} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary">←</Link>
          )}
          <span className="px-3 py-1.5 text-sm text-muted-foreground">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={buildUrl({ page: String(page + 1) })} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary">→</Link>
          )}
        </div>
      )}
    </AdminShell>
  );
}
