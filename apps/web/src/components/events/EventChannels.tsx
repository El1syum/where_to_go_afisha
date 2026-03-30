import { getAdmin } from "@/lib/auth";
import { PublishInline } from "./PublishInline";

const PLATFORM_CONFIG: Record<string, { label: string; icon: string }> = {
  TELEGRAM: { label: "Telegram", icon: "📨" },
  VK: { label: "VK", icon: "💬" },
  MAX: { label: "Max", icon: "💎" },
};

interface Channel {
  id: number;
  platform: string;
  name: string;
  channelUrl: string | null;
  channelId: string;
}

interface EventChannelsProps {
  eventId: number;
  channels: Channel[];
  publishedChannelIds: number[];
}

export async function EventChannels({ eventId, channels, publishedChannelIds }: EventChannelsProps) {
  const admin = await getAdmin();

  return (
    <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Следи за мероприятием на каналах:</h3>
      <div className="space-y-2">
        {channels.map((ch) => {
          const cfg = PLATFORM_CONFIG[ch.platform] || { label: ch.platform, icon: "📌" };
          const isPublished = publishedChannelIds.includes(ch.id);

          return (
            <div key={ch.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span>{cfg.icon}</span>
                <span className="text-gray-500">{cfg.label} —</span>
                {ch.channelUrl ? (
                  <a
                    href={ch.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    {ch.name}
                  </a>
                ) : (
                  <span className="font-medium">{ch.name}</span>
                )}
              </div>

              {admin && (
                <PublishInline
                  eventId={eventId}
                  channelId={ch.id}
                  isPublished={isPublished}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
