"use client";

import { useState } from "react";

interface Props {
  initialProxy: string;
  initialAutopostEnabled: boolean;
}

export function AutopostControls({ initialProxy, initialAutopostEnabled }: Props) {
  const [proxy, setProxy] = useState(initialProxy);
  const [enabled, setEnabled] = useState(initialAutopostEnabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  async function saveSetting(key: string, value: string) {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Ошибка сохранения");
    }
  }

  async function saveProxy() {
    setSaving(true);
    setError("");
    setSaved("");
    try {
      await saveSetting("telegram_proxy", proxy);
      setSaved("Прокси сохранён. Применится при следующем цикле постинга.");
      setTimeout(() => setSaved(""), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAutopost() {
    const newValue = !enabled;
    setSaving(true);
    setError("");
    setSaved("");
    try {
      await saveSetting("autopost_enabled", String(newValue));
      setEnabled(newValue);
      setSaved(newValue ? "Автопостинг включён" : "Автопостинг остановлен");
      setTimeout(() => setSaved(""), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-8 space-y-4">
      {/* Autopost toggle */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Автопостинг</h2>
            <p className="text-sm text-muted-foreground">
              Публикация в Telegram и Max каждые 30 минут
            </p>
          </div>
          <button
            type="button"
            onClick={toggleAutopost}
            disabled={saving}
            className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
              enabled
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {saving ? "…" : enabled ? "Остановить" : "Запустить"}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${enabled ? "bg-green-500 animate-pulse" : "bg-red-400"}`}
          />
          <span className="text-sm font-medium">
            {enabled ? "Активен" : "Остановлен"}
          </span>
        </div>
      </div>

      {/* Proxy settings */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-2 text-lg font-semibold">Прокси для Telegram API</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          SOCKS5 прокси в формате <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">host:port:user:password</code>.
          Оставьте пустым для прямого подключения.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={proxy}
            onChange={(e) => setProxy(e.target.value)}
            placeholder="95.81.97.97:1081:user:password"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={saveProxy}
            disabled={saving}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "…" : "Сохранить"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{saved}</div>
      )}
    </div>
  );
}
