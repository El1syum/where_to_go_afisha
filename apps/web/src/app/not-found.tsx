import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4">
          <Link href="/" className="text-xl font-bold text-primary">
            Куда сходить?
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="text-8xl font-bold text-primary/20">404</div>
        <h1 className="mt-4 text-2xl font-bold">Страница не найдена</h1>
        <p className="mt-2 text-muted-foreground">
          Возможно, она была удалена или вы перешли по неверной ссылке
        </p>
        <Link
          href="/"
          className="mt-6 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          На главную
        </Link>
      </main>

      <footer className="border-t border-border bg-card py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Куда сходить? Все права защищены.
        </div>
      </footer>
    </div>
  );
}
