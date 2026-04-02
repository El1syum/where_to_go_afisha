"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface City {
  id: number;
  slug: string;
  name: string;
  namePrepositional: string | null;
  sortOrder: number;
  telegramChannelId: string | null;
  seoText?: string | null;
}

export function CityEditForm({ city }: { city: City }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(city.name);
  const [namePrep, setNamePrep] = useState(city.namePrepositional || "");
  const [sortOrder, setSortOrder] = useState(city.sortOrder);
  const [tgChannel, setTgChannel] = useState(city.telegramChannelId || "");
  const [seoText, setSeoText] = useState(city.seoText || "");

  async function save() {
    await fetch(`/api/admin/cities/${city.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        namePrepositional: namePrep || null,
        sortOrder,
        telegramChannelId: tgChannel || null,
        seoText: seoText || null,
      }),
    });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-primary hover:underline">
        Изменить
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold">Редактировать: {city.slug}</h3>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Название</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">В предложном падеже (в ...)</label>
            <input value={namePrep} onChange={(e) => setNamePrep(e.target.value)} placeholder="Москве" className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Порядок сортировки</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(+e.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Telegram Channel ID</label>
            <input value={tgChannel} onChange={(e) => setTgChannel(e.target.value)} placeholder="@channel или -100..." className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">SEO-текст (отображается на странице города)</label>
            <textarea
              value={seoText}
              onChange={(e) => setSeoText(e.target.value)}
              rows={5}
              placeholder="Уникальное описание города для поисковиков..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">Разделяйте абзацы переносом строки</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={save} className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground">Сохранить</button>
          <button onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-border py-2 text-sm">Отмена</button>
        </div>
      </div>
    </div>
  );
}
