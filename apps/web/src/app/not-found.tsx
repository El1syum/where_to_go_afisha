import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f3f4f6]">
      <header className="bg-[#1e1b3a]">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6">
          <Link href="/" className="text-lg font-bold text-indigo-400">
            Куда сходить?
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="text-8xl font-bold text-indigo-500/20">404</div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Страница не найдена</h1>
        <p className="mt-2 text-gray-500">
          Возможно, она была удалена или вы перешли по неверной ссылке
        </p>
        <Link
          href="/"
          className="mt-6 rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
        >
          На главную
        </Link>
      </main>

      <footer className="bg-[#1e1b3a] py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Куда сходить? Все права защищены.
        </div>
      </footer>
    </div>
  );
}
