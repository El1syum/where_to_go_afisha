import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | Куда сходить?",
    default: "Куда сходить? — мероприятия в вашем городе",
  },
  description:
    "Куда сходить? Мероприятия по городам России. Концерты, театр, выставки, экскурсии, спорт. Расписание и онлайн покупка билетов.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
