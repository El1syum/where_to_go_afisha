import { prisma } from "@/lib/db";

const PLATFORM_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  TELEGRAM: { label: "Telegram", icon: "📨", color: "bg-blue-50 text-blue-700 border-blue-200" },
  VK: { label: "VK", icon: "💬", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  MAX: { label: "Max", icon: "💎", color: "bg-purple-50 text-purple-700 border-purple-200" },
};

export async function CitySocials({ cityId }: { cityId: number }) {
  const channels = await prisma.channel.findMany({
    where: { cityId, isActive: true, channelUrl: { not: null } },
    orderBy: [{ platform: "asc" }, { name: "asc" }],
    select: { id: true, platform: true, name: true, description: true, channelUrl: true },
  });

  if (channels.length === 0) return null;

  // Group by platform
  const grouped = new Map<string, typeof channels>();
  for (const ch of channels) {
    if (!grouped.has(ch.platform)) grouped.set(ch.platform, []);
    grouped.get(ch.platform)!.push(ch);
  }

  return (
    <div className="mt-8 rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 text-lg font-semibold">Мы в соцсетях</h2>
      <div className="space-y-3">
        {[...grouped.entries()].map(([platform, chs]) => {
          const cfg = PLATFORM_CONFIG[platform] || { label: platform, icon: "📌", color: "bg-secondary" };
          return (
            <div key={platform}>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {chs.map((ch) => (
                  <a
                    key={ch.id}
                    href={ch.channelUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors hover:opacity-80 ${cfg.color}`}
                  >
                    <span className="font-medium">{ch.name}</span>
                    {ch.description && <span className="text-xs opacity-70">— {ch.description}</span>}
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
