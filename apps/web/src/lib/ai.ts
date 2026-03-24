const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

export async function rephraseText(
  text: string,
  prompt?: string | null,
  model?: string | null,
): Promise<string> {
  if (!OPENROUTER_API_KEY) return text;

  const systemPrompt = prompt ||
    "Ты — копирайтер для афиши мероприятий. Перефразируй описание мероприятия: сделай его более живым, привлекательным и вовлекающим. Сохрани все факты (дата, место, цена). Не добавляй выдуманную информацию. Отвечай только перефразированным текстом, без пояснений.";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!res.ok) return text;

    const data = await res.json();
    const result = data.choices?.[0]?.message?.content?.trim();
    return result || text;
  } catch {
    return text;
  }
}
