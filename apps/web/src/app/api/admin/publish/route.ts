import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { renderPostFromTemplate } from "@/lib/post-template";

async function sendTelegram(channel: { channelId: string }, text: string, imageUrl: string | null): Promise<number> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN not configured");

  let messageId = 0;
  let sent = false;

  if (imageUrl) {
    // Try local file
    if (imageUrl.includes("/api/images/")) {
      try {
        const { readFile } = await import("fs/promises");
        const { join } = await import("path");
        const filename = imageUrl.split("/api/images/")[1];
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
        body: JSON.stringify({ chat_id: channel.channelId, photo: imageUrl, caption: text, parse_mode: "HTML" }),
      });
      const d = await r.json();
      if (d.ok) { messageId = d.result.message_id; sent = true; }
    }
  }

  if (!sent) {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channel.channelId, text, parse_mode: "HTML" }),
    });
    const d = await r.json();
    if (!d.ok) throw new Error(d.description);
    messageId = d.result.message_id;
  }

  return messageId;
}

async function sendMax(channel: { channelId: string }, text: string, imageUrl: string | null): Promise<number> {
  const maxToken = process.env.MAX_BOT_TOKEN;
  if (!maxToken) throw new Error("MAX_BOT_TOKEN not configured");

  const body: Record<string, unknown> = {
    text,
    format: "html",
    notify: true,
  };

  if (imageUrl) {
    body.attachments = [{
      type: "image",
      payload: { url: imageUrl },
    }];
  }

  const res = await fetch(`https://platform-api.max.ru/messages?chat_id=${channel.channelId}`, {
    method: "POST",
    headers: {
      "Authorization": maxToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Max API ${res.status}: ${errText}`);
  }

  const data = await res.json() as { message?: { body?: { mid?: string } } };
  return parseInt(data.message?.body?.mid || "0") || 0;
}

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

  try {
    let messageId = 0;

    if (channel.platform === "MAX") {
      messageId = await sendMax(channel, text, event.imageUrl);
    } else {
      messageId = await sendTelegram(channel, text, event.imageUrl);
    }

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
