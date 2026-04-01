"use client";

import { useState, useMemo } from "react";
import { ToggleSwitch } from "./ToggleSwitch";
import { ChannelForm } from "./ChannelForm";

const PLATFORM_LABELS: Record<string, string> = {
  TELEGRAM: "Telegram",
  VK: "VK",
  MAX: "Max",
};

interface Channel {
  id: number;
  cityId: number;
  platform: string;
  name: string;
  description: string | null;
  channelId: string;
  channelUrl: string | null;
  isActive: boolean;
  categories: string | null;
  minAge: number | null;
  kidsOnly: boolean;
  publishHourFrom: number;
  publishHourTo: number;
  maxPostsPerDay: number;
  postIntervalMinutes: number;
  postTemplate: string | null;
  aiRephrase: boolean;
  aiModel: string | null;
  aiPrompt: string | null;
  city: { name: string; slug: string };
  _count: { posts: number };
}

interface City {
  id: number;
  slug: string;
  name: string;
}

interface Category {
  slug: string;
  name: string;
}

interface ChannelListProps {
  channels: Channel[];
  cities: City[];
  categories: Category[];
}

export function ChannelList({ channels, cities, categories }: ChannelListProps) {
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");

  const citiesWithChannels = useMemo(() => {
    const ids = new Set(channels.map((c) => c.cityId));
    return cities.filter((c) => ids.has(c.id)).sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [channels, cities]);

  const platforms = useMemo(() => {
    return [...new Set(channels.map((c) => c.platform))].sort();
  }, [channels]);

  const filtered = useMemo(() => {
    return channels.filter((ch) => {
      if (platformFilter !== "all" && ch.platform !== platformFilter) return false;
      if (cityFilter !== "all" && ch.cityId !== parseInt(cityFilter)) return false;
      return true;
    });
  }, [channels, platformFilter, cityFilter]);

  return (
    <>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Платформа:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPlatformFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                platformFilter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              Все
            </button>
            {platforms.map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  platformFilter === p ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {PLATFORM_LABELS[p] || p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Город:</span>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1 text-xs outline-none focus:border-primary"
          >
            <option value="all">Все города ({channels.length})</option>
            {citiesWithChannels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({channels.filter((ch) => ch.cityId === c.id).length})
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-muted-foreground">
          Показано: {filtered.length} из {channels.length}
        </span>
      </div>

      {/* Channel cards */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Нет каналов по выбранным фильтрам</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((ch) => (
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
                  <div>макс. {ch.maxPostsPerDay}/день, интервал {ch.postIntervalMinutes} мин</div>
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
    </>
  );
}
