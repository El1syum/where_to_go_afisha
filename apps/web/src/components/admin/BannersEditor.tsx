"use client";

import { useState } from "react";

const SLIDES = [
  { title: "Самые яркие события города!", subtitle: "Концерты, театр, выставки и многое другое", image: "/banner/concert.jpg" },
  { title: "Не пропусти лучшие концерты", subtitle: "Живая музыка и незабываемые впечатления", image: "/banner/music.jpg" },
  { title: "Театральный сезон открыт", subtitle: "Премьеры, классика и современные постановки", image: "/banner/theater.jpg" },
  { title: "Культурные выходные", subtitle: "Выставки, лекции и мастер-классы", image: "/banner/exhibition.jpg" },
  { title: "Весело всей семьёй!", subtitle: "Детские мероприятия и развлечения", image: "/banner/family.jpg" },
];

interface Props {
  initial: (string | null)[];
}

export function BannersEditor({ initial }: Props) {
  const [links, setLinks] = useState<string[]>(
    Array.from({ length: 5 }, (_, i) => initial[i] || "")
  );
  const [saving, setSaving] = useState(false);
  const [savedIdx, setSavedIdx] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function saveOne(index: number) {
    setSaving(true);
    setError("");
    setSavedIdx(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: `banner_url_${index + 1}`, value: links[index] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Ошибка сохранения");
        return;
      }
      setSavedIdx(index);
      setTimeout(() => setSavedIdx((curr) => (curr === index ? null : curr)), 2500);
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  async function saveAll() {
    setSaving(true);
    setError("");
    setSavedIdx(null);
    try {
      for (let i = 0; i < 5; i++) {
        const res = await fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: `banner_url_${i + 1}`, value: links[i] }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || `Ошибка сохранения баннера #${i + 1}`);
          return;
        }
      }
      setSavedIdx(-1); // all saved marker
      setTimeout(() => setSavedIdx(null), 2500);
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Задайте ссылку для каждого баннера. Если поле пустое — баннер остаётся некликабельным.
        Поддерживаются как внешние ссылки (https://…), так и внутренние (например, /moscow/concerts).
      </p>

      {SLIDES.map((slide, i) => {
        const link = links[i];
        const isExternal = link.trim().startsWith("http");
        return (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex gap-4">
              <div
                className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg bg-cover bg-center"
                style={{ backgroundImage: `url(${slide.image})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 text-xs font-semibold leading-tight text-white">
                  {slide.title}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="text-sm font-medium">Баннер #{i + 1}: {slide.title}</div>
                <div className="text-xs text-muted-foreground">{slide.subtitle}</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={link}
                    onChange={(e) => {
                      const next = [...links];
                      next[i] = e.target.value;
                      setLinks(next);
                    }}
                    placeholder="https://… или /moscow/concerts (пусто — некликабельный)"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => saveOne(i)}
                    disabled={saving}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    Сохранить
                  </button>
                </div>
                {link.trim() && (
                  <div className="text-xs text-muted-foreground">
                    Тип: {isExternal ? "внешняя ссылка (откроется в новой вкладке)" : "внутренняя ссылка"}
                  </div>
                )}
                {savedIdx === i && (
                  <div className="text-xs text-green-600">Сохранено</div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={saveAll}
          disabled={saving}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Сохранение…" : "Сохранить всё"}
        </button>
        {savedIdx === -1 && <span className="text-sm text-green-600">Все баннеры сохранены</span>}
      </div>
    </div>
  );
}
