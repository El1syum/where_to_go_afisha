"use client";

import { useState } from "react";
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
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Город</label>
              <select value={form.cityId} onChange={(e) => set("cityId", +e.target.value)} className={inputCls}>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
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
            <div className="grid grid-cols-3 gap-3">
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
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.aiRephrase} onChange={(e) => set("aiRephrase", e.target.checked)} />
              AI перефразирование (OpenRouter)
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
