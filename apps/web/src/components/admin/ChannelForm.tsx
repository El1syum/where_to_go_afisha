"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

interface City { id: number; slug: string; name: string }
interface Category { slug: string; name: string }

interface ChannelFormProps {
  cities: City[];
  categories: Category[];
  editChannel?: {
    id: number;
    cityId: number;
    platform: string;
    name: string;
    description: string | null;
    channelId: string;
    channelUrl: string | null;
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
  };
}

export function ChannelForm({ cities, categories, editChannel }: ChannelFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = !!editChannel;

  const [form, setForm] = useState({
    cityId: editChannel?.cityId || cities[0]?.id || 0,
    platform: editChannel?.platform || "TELEGRAM",
    name: editChannel?.name || "",
    description: editChannel?.description || "",
    channelId: editChannel?.channelId || "",
    channelUrl: editChannel?.channelUrl || "",
    categories: editChannel?.categories ? JSON.parse(editChannel.categories) : [],
    minAge: editChannel?.minAge ?? "",
    kidsOnly: editChannel?.kidsOnly || false,
    publishHourFrom: editChannel?.publishHourFrom ?? 9,
    publishHourTo: editChannel?.publishHourTo ?? 22,
    maxPostsPerDay: editChannel?.maxPostsPerDay ?? 10,
    postIntervalMinutes: editChannel?.postIntervalMinutes ?? 30,
    postTemplate: editChannel?.postTemplate || `<TYPE_EMOJI> <b><TYPE></b>\n━━━━━━━━━━━━━━━\n<b><NAME></b>\n\n<<DESCRIPTION>>\n\n📅 <DATE>\n📍 <PLACE>\n💰 <PRICE>\n\n🎟 <a href="<URL>"><BUTTON></a>\n\n<TAGS>`,
    aiRephrase: editChannel?.aiRephrase || false,
    aiModel: editChannel?.aiModel || "",
    aiPrompt: editChannel?.aiPrompt || "",
  });

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    const body = {
      ...form,
      minAge: form.minAge === "" ? null : Number(form.minAge),
      categories: form.categories.length > 0 ? JSON.stringify(form.categories) : null,
      aiModel: form.aiModel || null,
      aiPrompt: form.aiPrompt || null,
      description: form.description || null,
      postIntervalMinutes: Number(form.postIntervalMinutes) || 30,
      postTemplate: form.postTemplate || null,
      channelUrl: form.channelUrl || null,
    };

    if (isEdit) {
      await fetch(`/api/admin/channels/${editChannel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/admin/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Удалить канал?")) return;
    await fetch(`/api/admin/channels/${editChannel!.id}`, { method: "DELETE" });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={isEdit
        ? "text-xs text-primary hover:underline"
        : "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      }>
        {isEdit ? "Настроить" : "+ Добавить канал"}
      </button>
    );
  }

  const inputCls = "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold">{isEdit ? "Редактировать канал" : "Новый канал"}</h3>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-3">
            <CityDropdown
              cities={cities}
              value={form.cityId}
              onChange={(id) => set("cityId", id)}
            />
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Платформа</label>
              <select value={form.platform} onChange={(e) => set("platform", e.target.value)} className={inputCls}>
                <option value="TELEGRAM">Telegram</option>
                <option value="VK">VK</option>
                <option value="MAX">Max</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Название канала</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Афиша Москва" className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Описание</label>
            <input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Концерты и шоу" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">ID канала (@username или -100...)</label>
              <input value={form.channelId} onChange={(e) => set("channelId", e.target.value)} placeholder="@afisha_msk" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Ссылка</label>
              <input value={form.channelUrl} onChange={(e) => set("channelUrl", e.target.value)} placeholder="https://t.me/..." className={inputCls} />
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">Фильтры</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <label key={cat.slug} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={form.categories.includes(cat.slug)}
                    onChange={(e) => {
                      if (e.target.checked) set("categories", [...form.categories, cat.slug]);
                      else set("categories", form.categories.filter((c: string) => c !== cat.slug));
                    }}
                  />
                  {cat.name}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Пусто = все категории</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Возраст от</label>
              <input type="number" value={form.minAge} onChange={(e) => set("minAge", e.target.value)} placeholder="0" className={inputCls} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={form.kidsOnly} onChange={(e) => set("kidsOnly", e.target.checked)} />
                Только детское
              </label>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">Расписание</label>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">С (час)</label>
                <input type="number" min={0} max={23} value={form.publishHourFrom} onChange={(e) => set("publishHourFrom", +e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">До (час)</label>
                <input type="number" min={0} max={23} value={form.publishHourTo} onChange={(e) => set("publishHourTo", +e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Макс./день</label>
                <input type="number" min={1} value={form.maxPostsPerDay} onChange={(e) => set("maxPostsPerDay", +e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Интервал (мин)</label>
                <input type="number" min={1} value={form.postIntervalMinutes} onChange={(e) => set("postIntervalMinutes", +e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Шаблон поста (пусто = глобальный)</label>
            <textarea
              value={form.postTemplate}
              onChange={(e) => set("postTemplate", e.target.value)}
              rows={10}
              className={inputCls + " font-mono text-xs"}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Переменные: {"<TYPE>"} {"<NAME>"} {"<DATE>"} {"<PLACE>"} {"<PRICE>"} {"<URL>"} {"<BUTTON>"} {"<TAGS>"} {"<CITY>"} {"<AGE>"} {"<DESCRIPTION>"} {"<<DESCRIPTION>>"} (AI)
            </p>
          </div>

          <div className="border-t border-border pt-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.aiRephrase} onChange={(e) => set("aiRephrase", e.target.checked)} />
              AI перефразирование (для {"<<DESCRIPTION>>"})
            </label>
            {form.aiRephrase && (
              <div className="mt-2 space-y-2">
                <input value={form.aiModel} onChange={(e) => set("aiModel", e.target.value)} placeholder="google/gemini-2.0-flash-001" className={inputCls} />
                <textarea value={form.aiPrompt} onChange={(e) => set("aiPrompt", e.target.value)} placeholder="Перефразируй описание мероприятия..." rows={3} className={inputCls} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={save} className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground">
            {isEdit ? "Сохранить" : "Создать"}
          </button>
          {isEdit && (
            <button onClick={remove} className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50">Удалить</button>
          )}
          <button onClick={() => setOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Отмена</button>
        </div>
      </div>
    </div>
  );
}

function CityDropdown({ cities, value, onChange }: { cities: City[]; value: number; onChange: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => [...cities].sort((a, b) => a.name.localeCompare(b.name, "ru")), [cities]);
  const filtered = search ? sorted.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())) : sorted;
  const selectedName = sorted.find((c) => c.id === value)?.name || "Выберите";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <label className="mb-1 block text-xs text-muted-foreground">Город</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-sm outline-none focus:border-primary"
      >
        {selectedName}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-border bg-card shadow-xl">
          <div className="border-b border-border p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск города..."
              autoFocus
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.id); setOpen(false); setSearch(""); }}
                className={`w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${value === c.id ? "bg-primary/10 font-medium text-primary" : "hover:bg-secondary"}`}
              >
                {c.name}
              </button>
            ))}
            {filtered.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Не найдено</div>}
          </div>
        </div>
      )}
    </div>
  );
}
