import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div>
            <div className="text-lg font-bold text-primary">Куда сходить?</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Афиша мероприятий по городам России
            </p>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/moscow" className="transition-colors hover:text-foreground">Москва</Link>
            <Link href="/saint-petersburg" className="transition-colors hover:text-foreground">Петербург</Link>
            <Link href="/kazan" className="transition-colors hover:text-foreground">Казань</Link>
          </div>
        </div>
        <div className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Куда сходить? Все права защищены.
        </div>
      </div>
    </footer>
  );
}
