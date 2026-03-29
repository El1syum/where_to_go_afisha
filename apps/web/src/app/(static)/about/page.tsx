import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "О проекте",
  description: "Куда сходить? — агрегатор мероприятий по городам России. Концерты, театр, выставки, экскурсии и другие события в вашем городе.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-4">
          <Link href="/" className="text-xl font-bold text-primary">Куда сходить?</Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <h1 className="mb-8 text-3xl font-bold">О проекте</h1>

        <div className="prose max-w-none space-y-6 text-foreground">
          <p className="text-lg text-muted-foreground">
            <strong>Куда сходить?</strong> — это афиша мероприятий по городам России. Мы собираем информацию о концертах, спектаклях, выставках, экскурсиях, стендапах и других событиях в одном месте, чтобы вам было проще выбрать, куда пойти.
          </p>

          <h2 className="text-xl font-semibold">Что мы делаем</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Собираем мероприятия из проверенных источников и обновляем базу ежедневно</li>
            <li>Охватываем более <strong>190 городов</strong> России</li>
            <li>Предоставляем удобные фильтры по дате, категории, цене и возрасту</li>
            <li>Автоматически определяем ваш город для персональных рекомендаций</li>
            <li>Публикуем анонсы мероприятий в Telegram-каналах городов</li>
          </ul>

          <h2 className="text-xl font-semibold">Категории мероприятий</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {[
              { icon: "🎬", name: "Фильмы" },
              { icon: "🎵", name: "Концерты" },
              { icon: "🎭", name: "Театр" },
              { icon: "🖼️", name: "Выставки" },
              { icon: "🎓", name: "Лекции" },
              { icon: "🔍", name: "Квесты" },
              { icon: "⚽", name: "Спорт" },
              { icon: "🗺️", name: "Экскурсии" },
              { icon: "🎤", name: "Стендап" },
              { icon: "🎉", name: "События" },
            ].map((cat) => (
              <div key={cat.name} className="rounded-lg border border-border bg-card p-3 text-center">
                <div className="text-2xl">{cat.icon}</div>
                <div className="mt-1 text-sm font-medium">{cat.name}</div>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-semibold">Для организаторов</h2>
          <p>
            Если вы организатор мероприятий и хотите разместить информацию о своих событиях на нашем портале, свяжитесь с нами через раздел <Link href="/contacts" className="text-primary hover:underline">Контакты</Link>.
          </p>
        </div>
      </main>

      <footer className="border-t border-border bg-card py-6">
        <div className="mx-auto max-w-4xl px-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Куда сходить? Все права защищены.
        </div>
      </footer>
    </div>
  );
}
