"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface City { id: number; slug: string; name: string }
interface Category { id: number; slug: string; name: string }

interface EventFormProps {
  cities: City[];
  categories: Category[];
}

export function EventForm({ cities, categories }: EventFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    place: "",
    price: "",
    imageUrl: "",
    affiliateUrl: "",
    age: "",
    isKids: false,
    isPremiere: false,
    cityId: cities[0]?.id || 0,
    categoryId: categories[0]?.id || 0,
    createBanner: false,
  });

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!form.title || !form.date) {
      setError("Название и дата обязательны");
      return;
    }
    if (form.createBanner && !form.imageUrl) {
      setError("Для размещения баннера нужна картинка мероприятия");
      return;
    }

    setSaving(true);
    setError("");

    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: form.price ? parseFloat(form.price) : null,
        age: form.age ? parseInt(form.age) : null,
        imageUrl: form.imageUrl || null,
        affiliateUrl: form.affiliateUrl || null,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/admin/events"), 1500);
    } else {
      setError(data.error || "Ошибка сохранения");
    }
  }

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

  // City search dropdown
  const [cityOpen, setCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const cityRef = useRef<HTMLDivElement>(null);
  const sortedCities = useMemo(() => [...cities].sort((a, b) => a.name.localeCompare(b.name, "ru")), [cities]);
  const filteredCities = citySearch ? sortedCities.filter((c) => c.name.toLowerCase().includes(citySearch.toLowerCase())) : sortedCities;
  const selectedCityName = sortedCities.find((c) => c.id === form.cityId)?.name || "Выберите";

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false); }
    if (cityOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [cityOpen]);

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="text-4xl">✅</div>
        <p className="mt-2 font-semibold">Мероприятие добавлено!</p>
        <p className="text-sm text-muted-foreground">Перенаправление...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl rounded-xl border border-border bg-card p-6">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Название *</label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Концерт группы..." className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div ref={cityRef} className="relative">
            <label className="mb-1 block text-sm font-medium">Город *</label>
            <button type="button" onClick={() => setCityOpen(!cityOpen)} className={inputCls + " text-left"}>
              {selectedCityName}
            </button>
            {cityOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-border bg-card shadow-xl">
                <div className="border-b border-border p-2">
                  <input type="text" value={citySearch} onChange={(e) => setCitySearch(e.target.value)} placeholder="Поиск..." autoFocus className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary" />
                </div>
                <div className="max-h-48 overflow-y-auto p-1">
                  {filteredCities.map((c) => (
                    <button key={c.id} type="button" onClick={() => { set("cityId", c.id); setCityOpen(false); setCitySearch(""); }}
                      className={`w-full rounded-lg px-3 py-1.5 text-left text-sm ${form.cityId === c.id ? "bg-primary/10 font-medium text-primary" : "hover:bg-secondary"}`}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Категория *</label>
            <select value={form.categoryId} onChange={(e) => set("categoryId", +e.target.value)} className={inputCls}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Дата и время *</label>
            <input type="datetime-local" value={form.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Цена (₽)</label>
            <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0 = бесплатно" className={inputCls} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Место проведения</label>
          <input value={form.place} onChange={(e) => set("place", e.target.value)} placeholder="Название площадки" className={inputCls} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Описание</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={5} placeholder="Подробное описание мероприятия..." className={inputCls} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">URL изображения</label>
          <input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://..." className={inputCls} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Ссылка на покупку билета</label>
          <input value={form.affiliateUrl} onChange={(e) => set("affiliateUrl", e.target.value)} placeholder="https://..." className={inputCls} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Возраст</label>
            <select value={form.age} onChange={(e) => set("age", e.target.value)} className={inputCls}>
              <option value="">Не указан</option>
              <option value="0">0+</option>
              <option value="6">6+</option>
              <option value="12">12+</option>
              <option value="16">16+</option>
              <option value="18">18+</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isKids} onChange={(e) => set("isKids", e.target.checked)} />
              Детское
            </label>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isPremiere} onChange={(e) => set("isPremiere", e.target.checked)} />
              Премьера
            </label>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-secondary/30 p-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.createBanner}
              onChange={(e) => set("createBanner", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border"
              disabled={!form.imageUrl}
            />
            <div>
              <div className="font-medium">Разместить баннер</div>
              <div className="text-xs text-muted-foreground">
                Автоматически создать активный баннер для этого города: картинка, название и ссылка мероприятия.
                {!form.imageUrl && (
                  <span className="mt-1 block text-amber-600">Требуется URL изображения мероприятия.</span>
                )}
              </div>
            </div>
          </label>
        </div>

        <div className="flex gap-3 border-t border-border pt-4">
          <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {saving ? "Сохранение..." : "Добавить мероприятие"}
          </button>
          <button onClick={() => router.push("/admin/events")} className="rounded-lg border border-border px-6 py-2.5 text-sm">
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
