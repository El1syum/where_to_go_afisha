"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState, useRef, useEffect } from "react";

const FILTER_BUTTONS = [
  { key: "today", label: "Сегодня" },
  { key: "tomorrow", label: "Завтра" },
  { key: "weekend", label: "Выходные" },
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
] as const;

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);

  const activeFilter = searchParams.get("date") || "";
  const activeExact = searchParams.get("exact") || "";

  const today = new Date();
  const selectedDate = activeExact ? new Date(activeExact + "T00:00:00") : null;
  const [viewMonth, setViewMonth] = useState(selectedDate ? selectedDate.getMonth() : today.getMonth());
  const [viewYear, setViewYear] = useState(selectedDate ? selectedDate.getFullYear() : today.getFullYear());

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    if (calendarOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [calendarOpen]);

  const setFilter = useCallback(
    (key: string, exact?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (exact) {
        params.delete("date");
        params.set("exact", exact);
      } else if (key) {
        params.set("date", key);
        params.delete("exact");
      } else {
        params.delete("date");
        params.delete("exact");
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  function pickDate(d: Date) {
    const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setFilter("", str);
    setCalendarOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));

  const displayExact = selectedDate
    ? selectedDate.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    : null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <button
        onClick={() => { setFilter(""); setCalendarOpen(false); }}
        className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
          !activeFilter && !activeExact
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-secondary/70 text-foreground hover:bg-secondary"
        }`}
      >
        Все даты
      </button>

      {FILTER_BUTTONS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => { setFilter(key); setCalendarOpen(false); }}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
            activeFilter === key
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary/70 text-foreground hover:bg-secondary"
          }`}
        >
          {label}
        </button>
      ))}

      {/* Calendar picker */}
      <div className="relative" ref={calRef}>
        <button
          onClick={() => setCalendarOpen(!calendarOpen)}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
            activeExact
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary/70 text-foreground hover:bg-secondary"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {displayExact || "Дата"}
        </button>

        {calendarOpen && (
          <div className="absolute left-0 top-full z-50 mt-2 w-[280px] rounded-2xl border border-border bg-card p-4 shadow-xl">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <button onClick={prevMonth} className="rounded-lg p-1.5 hover:bg-secondary">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-semibold">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button onClick={nextMonth} className="rounded-lg p-1.5 hover:bg-secondary">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Weekday headers */}
            <div className="mb-1 grid grid-cols-7 text-center">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1 text-xs font-medium text-muted-foreground">{w}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} />;

                const isToday = isSameDay(date, today);
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => pickDate(date)}
                    disabled={isPast}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition-all ${
                      isSelected
                        ? "bg-primary font-semibold text-primary-foreground"
                        : isToday
                          ? "border border-primary font-semibold text-primary"
                          : isPast
                            ? "text-muted-foreground/40"
                            : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Quick actions */}
            <div className="mt-3 flex gap-2 border-t border-border pt-3">
              <button
                onClick={() => { pickDate(today); }}
                className="flex-1 rounded-lg bg-secondary py-1.5 text-xs font-medium hover:bg-secondary/80"
              >
                Сегодня
              </button>
              <button
                onClick={() => { setFilter(""); setCalendarOpen(false); }}
                className="flex-1 rounded-lg bg-secondary py-1.5 text-xs font-medium hover:bg-secondary/80"
              >
                Сбросить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
