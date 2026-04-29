import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kudaafisha.ru";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: "%s | Куда сходить?",
    default: "Куда сходить? — мероприятия в вашем городе",
  },
  description:
    "Куда сходить? Мероприятия по городам России. Концерты, театр, выставки, экскурсии, спорт. Расписание и онлайн покупка билетов.",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Куда сходить?",
  },
  twitter: {
    card: "summary_large_image",
  },
  manifest: "/manifest.json",
  themeColor: "#6366f1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Куда сходить?",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="dns-prefetch" href="//avatars.mds.yandex.net" />
        <link rel="dns-prefetch" href="//cdn.kassir.ru" />
        <link rel="dns-prefetch" href="//s1.afisha.ru" />
        <link rel="preconnect" href="https://avatars.mds.yandex.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.kassir.ru" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=108200829','ym');ym(108200829,'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});`,
          }}
        />
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/108200829" style={{ position: "absolute", left: "-9999px" }} alt="" />
          </div>
        </noscript>
      </head>
      <body className="min-h-screen bg-[#f3f4f6] text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
