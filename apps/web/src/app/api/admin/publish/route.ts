import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId, channelId } = await request.json();

  // Get event and channel
  const [event, channel] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      include: {
        city: true,
        category: true,
      },
    }),
    prisma.channel.findUnique({ where: { id: channelId } }),
  ]);

  if (!event || !channel) {
    return NextResponse.json({ error: "Event or channel not found" }, { status: 404 });
  }

  // Check if already published
  const existing = await prisma.telegramPost.findUnique({
    where: { eventId_channelDbId: { eventId, channelDbId: channelId } },
  });
  if (existing?.status === "SENT") {
    return NextResponse.json({ error: "Уже опубликовано" }, { status: 400 });
  }

  // Format message
  const MONTHS = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const EMOJI: Record<string, string> = { films:"🎬",concerts:"🎵",theatre:"🎭",exhibitions:"🖼",lectures:"🎓",quests:"🔍",sport:"⚽",excursions:"🗺",standup:"🎤",events:"🎉" };

  const d = event.date;
  const dateStr = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const emoji = EMOJI[event.category.slug] || "📌";
  const price = event.price && Number(event.price) > 0 ? `от ${Number(event.price).toLocaleString("ru-RU")} ₽` : "Бесплатно";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://kudaafisha.ru";
  const utm = `?utm_source=telegram&utm_medium=channel&utm_campaign=${encodeURIComponent(channel.channelId.replace("@", ""))}`;
  const eventUrl = `${siteUrl}/${event.city.slug}/${event.category.slug}/${event.slug}${utm}`;

  const placeLine = event.place ? `📍 ${event.place}` : `📍 <a href="${eventUrl}">Узнать на сайте</a>`;

  const tags = [`#${event.category.name.replace(/[^а-яА-ЯёЁa-zA-Z0-9]/g, "")}`];
  if (event.place) tags.push(`#${event.place.replace(/[^а-яА-ЯёЁa-zA-Z0-9]/g, "")}`);

  const text = [
    `${emoji} <b>${event.category.name}</b>`,
    "━━━━━━━━━━━━━━━",
    `<b>${event.title}</b>`,
    "",
    `📅 ${dateStr}`,
    placeLine,
    `💰 ${price}`,
    "",
    `🎟 <a href="${eventUrl}">Купить билет</a>`,
    "",
    tags.join(" "),
  ].join("\n");

  // Send to Telegram
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });
  }

  try {
    let messageId: number;

    if (event.imageUrl) {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channel.channelId,
          photo: event.imageUrl,
          caption: text,
          parse_mode: "HTML",
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.description || "Telegram error");
      messageId = data.result.message_id;
    } else {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channel.channelId,
          text,
          parse_mode: "HTML",
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.description || "Telegram error");
      messageId = data.result.message_id;
    }

    // Save to DB
    if (existing) {
      await prisma.telegramPost.update({
        where: { id: existing.id },
        data: { status: "SENT", messageId, sentAt: new Date(), errorMessage: null },
      });
    } else {
      await prisma.telegramPost.create({
        data: {
          eventId,
          cityId: event.cityId,
          channelDbId: channelId,
          messageId,
          channelId: channel.channelId,
          status: "SENT",
          sentAt: new Date(),
        },
      });
    }

    return NextResponse.json({ ok: true, message: "Опубликовано!" });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    if (existing) {
      await prisma.telegramPost.update({
        where: { id: existing.id },
        data: { status: "FAILED", errorMessage: errorMsg },
      });
    } else {
      await prisma.telegramPost.create({
        data: {
          eventId,
          cityId: event.cityId,
          channelDbId: channelId,
          channelId: channel.channelId,
          status: "FAILED",
          errorMessage: errorMsg,
        },
      });
    }

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
