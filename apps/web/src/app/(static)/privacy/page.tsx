import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  description: "Политика конфиденциальности портала Куда сходить?",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-4">
          <Link href="/" className="text-xl font-bold text-primary">Куда сходить?</Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <h1 className="mb-8 text-3xl font-bold">Политика конфиденциальности</h1>

        <div className="prose max-w-none space-y-6 text-foreground text-sm">
          <p className="text-muted-foreground">Дата последнего обновления: {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</p>

          <h2 className="text-lg font-semibold">1. Общие положения</h2>
          <p>Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей сайта kudaafisha.ru (далее — «Сайт»), управляемого администрацией проекта «Куда сходить?» (далее — «Администрация»).</p>
          <p>Использование Сайта означает согласие пользователя с настоящей Политикой и условиями обработки его персональных данных.</p>

          <h2 className="text-lg font-semibold">2. Какие данные мы собираем</h2>
          <p>При использовании Сайта могут собираться следующие данные:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>IP-адрес — для определения вашего города и отображения актуальных мероприятий</li>
            <li>Данные cookies — для сохранения выбранного города и настроек</li>
            <li>Данные о действиях на сайте — посещённые страницы, переходы (через Яндекс.Метрику)</li>
            <li>Имя и текст отзыва — при добавлении отзыва к мероприятию</li>
          </ul>

          <h2 className="text-lg font-semibold">3. Цели обработки данных</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Определение местоположения пользователя для отображения мероприятий в его городе</li>
            <li>Улучшение работы Сайта и его содержимого</li>
            <li>Анализ посещаемости и поведения пользователей</li>
            <li>Отображение рекламных материалов</li>
          </ul>

          <h2 className="text-lg font-semibold">4. Использование cookies</h2>
          <p>Сайт использует cookies для:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Сохранения выбранного города (<code>preferred_city</code>)</li>
            <li>Подтверждения определения города (<code>city_confirmed</code>)</li>
            <li>Авторизации администраторов (<code>admin_token</code>)</li>
          </ul>
          <p>Вы можете отключить cookies в настройках браузера, но это может повлиять на работу Сайта.</p>

          <h2 className="text-lg font-semibold">5. Сторонние сервисы</h2>
          <p>На Сайте используются следующие сторонние сервисы, которые могут собирать данные в соответствии с их политиками конфиденциальности:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li><strong>Яндекс.Метрика</strong> — аналитика посещаемости (<a href="https://yandex.ru/legal/confidential/" className="text-primary hover:underline" target="_blank" rel="noopener">политика Яндекса</a>)</li>
            <li><strong>Рекламная сеть Яндекса (РСЯ)</strong> — показ рекламы</li>
            <li><strong>Яндекс.Карты</strong> — отображение места проведения мероприятия</li>
          </ul>

          <h2 className="text-lg font-semibold">6. Защита данных</h2>
          <p>Администрация принимает необходимые организационные и технические меры для защиты персональных данных пользователей от неправомерного доступа, уничтожения, изменения, блокирования, копирования и распространения.</p>

          <h2 className="text-lg font-semibold">7. Права пользователей</h2>
          <p>Пользователь имеет право:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Запросить информацию об обрабатываемых персональных данных</li>
            <li>Потребовать удаления своих персональных данных</li>
            <li>Отозвать согласие на обработку персональных данных</li>
          </ul>
          <p>Для реализации указанных прав обратитесь через раздел <Link href="/contacts" className="text-primary hover:underline">Контакты</Link>.</p>

          <h2 className="text-lg font-semibold">8. Изменения</h2>
          <p>Администрация оставляет за собой право вносить изменения в настоящую Политику. Актуальная версия размещена на данной странице.</p>
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
