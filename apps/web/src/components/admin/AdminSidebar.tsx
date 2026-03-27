"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Дашборд", icon: "📊" },
  { href: "/admin/events", label: "Мероприятия", icon: "🎫" },
  { href: "/admin/cities", label: "Города", icon: "🏙️" },
  { href: "/admin/categories", label: "Категории", icon: "📂" },
  { href: "/admin/reviews", label: "Отзывы", icon: "💬" },
  { href: "/admin/channels", label: "Каналы", icon: "📡" },
  { href: "/admin/telegram", label: "Публикации", icon: "📨" },
  { href: "/admin/import", label: "Импорт", icon: "📥" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-4">
        <Link href="/admin" className="text-lg font-bold text-primary">
          Админ-панель
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <span>🌐</span>
          На сайт
        </Link>
        <form action="/api/admin/logout" method="POST">
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <span>🚪</span>
            Выйти
          </button>
        </form>
      </div>
    </aside>
  );
}
