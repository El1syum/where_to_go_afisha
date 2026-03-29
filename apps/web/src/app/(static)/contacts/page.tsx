import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Контакты",
  description: "Связаться с командой проекта Куда сходить?",
};

export default function ContactsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-4">
          <Link href="/" className="text-xl font-bold text-primary">Куда сходить?</Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <h1 className="mb-8 text-3xl font-bold">Контакты</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 text-2xl">📨</div>
            <h2 className="mb-2 text-lg font-semibold">Telegram</h2>
            <p className="mb-3 text-sm text-muted-foreground">Самый быстрый способ связаться с нами</p>
            <a
              href="https://t.me/kudaafisha_support"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Написать в Telegram
            </a>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 text-2xl">📧</div>
            <h2 className="mb-2 text-lg font-semibold">Email</h2>
            <p className="mb-3 text-sm text-muted-foreground">Для деловых предложений и сотрудничества</p>
            <a
              href="mailto:info@kudaafisha.ru"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              info@kudaafisha.ru
            </a>
          </div>
        </div>

        <div className="mt-10 space-y-6">
          <h2 className="text-xl font-semibold">Часто задаваемые вопросы</h2>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-2 font-semibold">Как добавить своё мероприятие?</h3>
              <p className="text-sm text-muted-foreground">Свяжитесь с нами через Telegram или email. Мы рассмотрим вашу заявку и добавим мероприятие на портал.</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-2 font-semibold">Информация о мероприятии неверна</h3>
              <p className="text-sm text-muted-foreground">Если вы заметили ошибку в описании, дате или цене мероприятия, напишите нам — мы оперативно исправим.</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-2 font-semibold">Сотрудничество и реклама</h3>
              <p className="text-sm text-muted-foreground">Мы открыты к сотрудничеству с площадками, организаторами и рекламодателями. Напишите нам для обсуждения условий.</p>
            </div>
          </div>
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
