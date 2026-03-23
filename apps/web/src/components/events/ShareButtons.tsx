"use client";

import { useState } from "react";

interface ShareButtonsProps {
  title: string;
  url: string;
}

export function ShareButtons({ title, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      name: "Telegram",
      icon: "📨",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      color: "hover:bg-blue-50 hover:text-blue-600",
    },
    {
      name: "VK",
      icon: "💬",
      href: `https://vk.com/share.php?url=${encodedUrl}&title=${encodedTitle}`,
      color: "hover:bg-indigo-50 hover:text-indigo-600",
    },
    {
      name: "WhatsApp",
      icon: "📱",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      color: "hover:bg-green-50 hover:text-green-600",
    },
  ];

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-6 border-t border-border pt-6">
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Поделиться</h3>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm transition-colors ${link.color}`}
          >
            <span>{link.icon}</span>
            {link.name}
          </a>
        ))}
        <div className="relative">
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-secondary"
          >
            <span>🔗</span>
            Копировать
          </button>
          {copied && (
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 animate-fade-in rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-lg">
              Ссылка скопирована
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
