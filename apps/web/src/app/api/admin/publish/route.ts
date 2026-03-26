import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { renderPostFromTemplate } from "@/lib/post-template";

export async function POST(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId, channelId } = await request.json();

  const [event, channel] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, include: { city: true, category: true } }),
    prisma.channel.findUnique({ where: { id: channelId } }),
  ]);

  if (!event || !channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.telegramPost.findUnique({
    where: { eventId_channelDbId: { eventId, channelDbId: channelId } },
  });
  if (existing?.status === "SENT") return NextResponse.json({ error: "Уже опубликовано" }, { status: 400 });

  const text = await renderPostFromTemplate(event, channel);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });

  try {
    let messageId = 0;
    let sent = false;

    if (event.imageUrl) {
      // Try local file
      if (event.imageUrl.includes("/api/images/")) {
        try {
          const { readFile } = await import("fs/promises");
          const { join } = await import("path");
          const filename = event.imageUrl.split("/api/images/")[1];
          const fileData = await readFile(join(process.env.IMAGES_DIR || "/opt/afisha/images", filename));
          const formData = new FormData();
          formData.append("chat_id", channel.channelId);
          formData.append("photo", new Blob([fileData], { type: "image/jpeg" }), filename);
          formData.append("caption", text);
          formData.append("parse_mode", "HTML");
          const r = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, { method: "POST", body: formData });
          const d = await r.json();
          if (d.ok) { messageId = d.result.message_id; sent = true; }
        } catch {}
      }
      // Try remote URL
      if (!sent) {
        const r = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: channel.channelId, photo: event.imageUrl, caption: text, parse_mode: "HTML" }),
        });
        const d = await r.json();
        if (d.ok) { messageId = d.result.message_id; sent = true; }
      }
    }
    // Fallback / no image
    if (!sent) {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: channel.channelId, text, parse_mode: "HTML" }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.description);
      messageId = d.result.message_id;
    }

    // Save
    if (existing) {
      await prisma.telegramPost.update({ where: { id: existing.id }, data: { status: "SENT", messageId, sentAt: new Date(), errorMessage: null } });
    } else {
      await prisma.telegramPost.create({ data: { eventId, cityId: event.cityId, channelDbId: channelId, messageId, channelId: channel.channelId, status: "SENT", sentAt: new Date() } });
    }
    return NextResponse.json({ ok: true, message: "Опубликовано!" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (existing) await prisma.telegramPost.update({ where: { id: existing.id }, data: { status: "FAILED", errorMessage: msg } });
    else await prisma.telegramPost.create({ data: { eventId, cityId: event.cityId, channelDbId: channelId, channelId: channel.channelId, status: "FAILED", errorMessage: msg } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
