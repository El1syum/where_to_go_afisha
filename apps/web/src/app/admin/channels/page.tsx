import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import { ToggleSwitch } from "@/components/admin/ToggleSwitch";
import { ChannelForm } from "@/components/admin/ChannelForm";

const PLATFORM_LABELS: Record<string, string> = {
  TELEGRAM: "Telegram",
  VK: "VK",
  MAX: "Max",
};

export default async function AdminChannelsPage() {
  await requireAdmin();

  const channels = await prisma.channel.findMany({
    orderBy: [{ cityId: "asc" }, { platform: "asc" }],
    include: {
      city: { select: { name: true, slug: true } },
      _count: { select: { posts: true } },
    },
  });

  const cities = await prisma.city.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true },
  });

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
  });

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Каналы публикации ({channels.length})</h1>
        <ChannelForm cities={cities} categories={categories} />
      </div>

      {channels.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Нет каналов. Добавьте первый канал.</p>
      ) : (
        <div className="space-y-4">
          {channels.map((ch) => (
            <div key={ch.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <ToggleSwitch apiUrl={`/api/admin/channels/${ch.id}`} isActive={ch.isActive} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium">{PLATFORM_LABELS[ch.platform]}</span>
                      <span className="font-semibold">{ch.name}</span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {ch.city.name} &middot; {ch.channelId}
                      {ch.description && <span> &middot; {ch.description}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{ch._count.posts} публикаций</div>
                  <div>{ch.publishHourFrom}:00–{ch.publishHourTo}:00</div>
                  <div>макс. {ch.maxPostsPerDay}/день</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {ch.categories ? (
                  JSON.parse(ch.categories).map((cat: string) => (
                    <span key={cat} className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{cat}</span>
                  ))
                ) : (
                  <span className="text-muted-foreground">Все категории</span>
                )}
                {ch.minAge != null && <span className="rounded-full bg-secondary px-2 py-0.5">{ch.minAge}+</span>}
                {ch.kidsOnly && <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">Детское</span>}
                {ch.aiRephrase && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent">AI перефразирование</span>}
              </div>

              <div className="mt-3">
                <ChannelForm cities={cities} categories={categories} editChannel={ch} />
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
