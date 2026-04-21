"use client";

import { useState } from "react";

const DEFAULT_TEMPLATE = `<TYPE_EMOJI> <b><TYPE></b>
━━━━━━━━━━━━━━━
<b><NAME></b>

<<DESCRIPTION>>

📅 <DATE>
📍 <PLACE>
💰 <PRICE>

🎟 <a href="<URL>"><BUTTON></a>

<TAGS>`;

const VARIABLES = [
  { name: "<TYPE_EMOJI>", desc: "Эмодзи категории" },
  { name: "<TYPE>", desc: "Название категории" },
  { name: "<NAME>", desc: "Название мероприятия" },
  { name: "<DATE>", desc: "Дата" },
  { name: "<PLACE>", desc: "Место проведения" },
  { name: "<PRICE>", desc: "Цена" },
  { name: "<URL>", desc: "Ссылка на страницу" },
  { name: "<BUTTON>", desc: "Текст кнопки (Купить/Подробнее)" },
  { name: "<TAGS>", desc: "Хештеги" },
  { name: "<CITY>", desc: "Город" },
  { name: "<AGE>", desc: "Возраст (12+)" },
  { name: "<DESCRIPTION>", desc: "Описание (300 символов)" },
  { name: "<<DESCRIPTION>>", desc: "Описание с AI-рефразом" },
];

interface Props {
  initialTemplate: string | null;
}

export function GlobalTemplateEditor({ initialTemplate }: Props) {
  const [template, setTemplate] = useState(initialTemplate || DEFAULT_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "post_template", value: template }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ошибка сохранения");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setTemplate(DEFAULT_TEMPLATE);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 text-lg font-semibold">Глобальный шаблон постов</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Этот шаблон используется по умолчанию для всех каналов, у которых не задан свой шаблон.
      </p>

      <textarea
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        rows={14}
        className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
        placeholder="Шаблон поста..."
      />

      <div className="mb-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Доступные переменные:</p>
        <div className="flex flex-wrap gap-1.5">
          {VARIABLES.map((v) => (
            <button
              key={v.name}
              type="button"
              onClick={() => {
                setTemplate((t) => t + v.name);
              }}
              className="rounded bg-secondary px-2 py-1 text-xs font-mono transition-colors hover:bg-secondary/80"
              title={v.desc}
            >
              {v.name}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          <strong>Форматирование:</strong>{" "}
          <code className="rounded bg-secondary px-1">&lt;b&gt;жирный&lt;/b&gt;</code>,{" "}
          <code className="rounded bg-secondary px-1">&lt;i&gt;курсив&lt;/i&gt;</code>,{" "}
          <code className="rounded bg-secondary px-1">&lt;s&gt;зачёркнутый&lt;/s&gt;</code>,{" "}
          <code className="rounded bg-secondary px-1">&lt;u&gt;подчёркнутый&lt;/u&gt;</code>,{" "}
          <code className="rounded bg-secondary px-1">&lt;code&gt;моноширинный&lt;/code&gt;</code>,{" "}
          <code className="rounded bg-secondary px-1">||спойлер||</code> (скрытый текст для промокодов),{" "}
          <code className="rounded bg-secondary px-1">&lt;a href=&quot;…&quot;&gt;ссылка&lt;/a&gt;</code>
        </p>
      </div>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Сохранение..." : "Сохранить шаблон"}
        </button>
        <button
          onClick={handleReset}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
        >
          Сбросить по умолчанию
        </button>
        {saved && (
          <span className="text-sm text-green-600">Сохранено</span>
        )}
      </div>
    </div>
  );
}
