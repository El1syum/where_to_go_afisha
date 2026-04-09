"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";

interface City {
  id: number;
  slug: string;
  name: string;
}

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  cityId: number | null;
  city: { id?: number; slug: string; name: string } | null;
}

interface Props {
  initial: Banner[];
  cities: City[];
}

// sentinel values for the city filter dropdown
const FILTER_ALL = "__all__";
const FILTER_GLOBAL = "__global__";

export function BannersEditor({ initial, cities }: Props) {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>(initial);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>(FILTER_ALL);

  const citiesById = useMemo(() => new Map(cities.map((c) => [c.id, c])), [cities]);

  const filtered = useMemo(() => {
    if (filter === FILTER_ALL) return banners;
    if (filter === FILTER_GLOBAL) return banners.filter((b) => b.cityId == null);
    const cid = parseInt(filter, 10);
    return banners.filter((b) => b.cityId === cid);
  }, [filter, banners]);

  function handleUpdated(updated: Banner) {
    setBanners((list) => list.map((b) => (b.id === updated.id ? updated : b)));
  }
  function handleDeleted(id: number) {
    setBanners((list) => list.filter((b) => b.id !== id));
  }
  function handleCreated(created: Banner) {
    setBanners((list) => [...list, created].sort((a, b) => a.sortOrder - b.sortOrder));
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Баннеры показываются в слайдере на главной странице города.
        «Глобальные» — показываются во всех городах. Для конкретного города —
        выберите город в форме. На странице города будут показаны и глобальные, и свои.
        Если ссылка не задана — баннер некликабельный. Рекомендуемое соотношение ~16:7 (1600×700).
      </p>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <label className="text-sm font-medium text-muted-foreground">Фильтр:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        >
          <option value={FILTER_ALL}>Все баннеры</option>
          <option value={FILTER_GLOBAL}>Только глобальные</option>
          <optgroup label="Города">
            {cities.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </optgroup>
        </select>
        <span className="text-xs text-muted-foreground">
          Показано: {filtered.length} из {banners.length}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-4">
        {filtered.map((b) => (
          <BannerRow
            key={b.id}
            banner={b}
            cities={cities}
            citiesById={citiesById}
            onUpdate={handleUpdated}
            onDelete={handleDeleted}
            onError={setError}
            refresh={() => router.refresh()}
          />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
            Баннеров для этого фильтра нет.
          </div>
        )}
      </div>

      <NewBannerForm
        cities={cities}
        defaultCityId={filter !== FILTER_ALL && filter !== FILTER_GLOBAL ? parseInt(filter, 10) : null}
        onCreated={handleCreated}
        onError={setError}
        refresh={() => router.refresh()}
      />
    </div>
  );
}

function CityLabel({ city }: { city: Banner["city"] }) {
  if (!city) {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
        🌐 Глобальный
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800">
      📍 {city.name}
    </span>
  );
}

function BannerRow({
  banner,
  cities,
  citiesById,
  onUpdate,
  onDelete,
  onError,
  refresh,
}: {
  banner: Banner;
  cities: City[];
  citiesById: Map<number, City>;
  onUpdate: (b: Banner) => void;
  onDelete: (id: number) => void;
  onError: (msg: string) => void;
  refresh: () => void;
}) {
  const [title, setTitle] = useState(banner.title);
  const [subtitle, setSubtitle] = useState(banner.subtitle);
  const [linkUrl, setLinkUrl] = useState(banner.linkUrl || "");
  const [isActive, setIsActive] = useState(banner.isActive);
  const [cityId, setCityId] = useState<string>(banner.cityId != null ? String(banner.cityId) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isExternal = linkUrl.trim().startsWith("http");

  async function save() {
    setSaving(true);
    setSaved(false);
    onError("");
    try {
      const form = new FormData();
      form.set("title", title);
      form.set("subtitle", subtitle);
      form.set("linkUrl", linkUrl);
      form.set("isActive", isActive ? "true" : "false");
      form.set("cityId", cityId); // empty string = global
      const file = fileInputRef.current?.files?.[0];
      if (file) form.set("image", file);

      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: "PUT",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onError(data.error || "Ошибка сохранения");
        return;
      }
      const updated: Banner = await res.json();
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setPreviewUrl(null);
      refresh();
    } catch {
      onError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Удалить баннер «${banner.title}»?`)) return;
    setSaving(true);
    onError("");
    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onError(data.error || "Ошибка удаления");
        return;
      }
      onDelete(banner.id);
      refresh();
    } catch {
      onError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  async function moveSortOrder(delta: number) {
    setSaving(true);
    onError("");
    try {
      const form = new FormData();
      form.set("sortOrder", String(banner.sortOrder + delta));
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: "PUT",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onError(data.error || "Ошибка");
        return;
      }
      const updated: Banner = await res.json();
      onUpdate(updated);
      refresh();
    } catch {
      onError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  const displayImage = previewUrl || banner.imageUrl;
  const currentCityLabel: Banner["city"] = cityId
    ? (() => {
        const c = citiesById.get(parseInt(cityId, 10));
        return c ? { slug: c.slug, name: c.name, id: c.id } : banner.city;
      })()
    : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="w-full shrink-0 md:w-64">
          <div
            className="relative aspect-[16/9] overflow-hidden rounded-lg bg-cover bg-center bg-gray-100"
            style={{ backgroundImage: `url(${displayImage})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 text-xs font-semibold leading-tight text-white">
              {title || "Без названия"}
            </div>
            <div className="absolute left-2 top-2">
              <CityLabel city={currentCityLabel} />
            </div>
            {!isActive && (
              <div className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                Скрыт
              </div>
            )}
          </div>
          <div className="mt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const url = URL.createObjectURL(f);
                  setPreviewUrl(url);
                } else {
                  setPreviewUrl(null);
                }
              }}
              className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-secondary/80"
            />
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Заголовок</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Подзаголовок</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Город</label>
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">🌐 Глобальный (все города)</option>
              {cities.map((c) => (
                <option key={c.id} value={String(c.id)}>📍 {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Ссылка (пусто = некликабельный)</label>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://… или /moscow/concerts"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            {linkUrl.trim() && (
              <div className="mt-1 text-xs text-muted-foreground">
                {isExternal ? "Внешняя — откроется в новой вкладке" : "Внутренняя — откроется в той же вкладке"}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Активен
            </label>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => moveSortOrder(-15)}
                disabled={saving}
                className="rounded-lg border border-border px-2 py-2 text-xs hover:bg-secondary disabled:opacity-50"
                title="Переместить выше"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveSortOrder(15)}
                disabled={saving}
                className="rounded-lg border border-border px-2 py-2 text-xs hover:bg-secondary disabled:opacity-50"
                title="Переместить ниже"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "…" : "Сохранить"}
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Удалить
              </button>
            </div>
          </div>
          {saved && <div className="pt-1 text-xs text-green-600">Сохранено</div>}
        </div>
      </div>
    </div>
  );
}

function NewBannerForm({
  cities,
  defaultCityId,
  onCreated,
  onError,
  refresh,
}: {
  cities: City[];
  defaultCityId: number | null;
  onCreated: (b: Banner) => void;
  onError: (msg: string) => void;
  refresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [cityId, setCityId] = useState<string>(defaultCityId != null ? String(defaultCityId) : "");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function create() {
    const file = fileInputRef.current?.files?.[0];
    if (!title.trim() || !subtitle.trim() || !file) {
      onError("Заполните заголовок, подзаголовок и выберите картинку");
      return;
    }
    setSaving(true);
    onError("");
    try {
      const form = new FormData();
      form.set("title", title.trim());
      form.set("subtitle", subtitle.trim());
      form.set("linkUrl", linkUrl.trim());
      form.set("cityId", cityId);
      form.set("image", file);

      const res = await fetch("/api/admin/banners", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onError(data.error || "Ошибка создания");
        return;
      }
      const created: Banner = await res.json();
      onCreated(created);
      setTitle("");
      setSubtitle("");
      setLinkUrl("");
      setCityId(defaultCityId != null ? String(defaultCityId) : "");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setOpen(false);
      refresh();
    } catch {
      onError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border-2 border-dashed border-border bg-background py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        + Добавить баннер
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Новый баннер</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Отмена
        </button>
      </div>
      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Картинка (jpg/png/webp, до 8MB)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-secondary/80"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Заголовок</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Подзаголовок</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Город</label>
          <select
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">🌐 Глобальный (все города)</option>
            {cities.map((c) => (
              <option key={c.id} value={String(c.id)}>📍 {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Ссылка (необязательно)</label>
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://… или /moscow/concerts"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="button"
          onClick={create}
          disabled={saving}
          className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Создание…" : "Создать баннер"}
        </button>
      </div>
    </div>
  );
}
