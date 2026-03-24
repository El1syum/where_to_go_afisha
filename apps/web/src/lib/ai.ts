const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

const DEFAULT_PROMPT = `Ты — опытный редактор афиши мероприятий. Твоя задача — написать увлекательный анонс для Telegram-канала.

Правила:
1. Напиши 3-5 предложений о мероприятии
2. Добавь интересные факты об артисте/группе/месте/жанре из своих знаний (если знаешь)
3. Упомяни почему стоит посетить — атмосфера, уникальность, что ожидает зрителя
4. Пиши живым разговорным языком, с эмоцией, но без кликбейта
5. НЕ выдумывай даты, цены, адреса — только факты из описания и общеизвестные факты
6. НЕ используй фразы "не пропустите", "спешите", "только сегодня"
7. Отвечай ТОЛЬКО текстом анонса, без заголовков, без markdown, без пояснений`;

export async function rephraseText(
  text: string,
  prompt?: string | null,
  model?: string | null,
): Promise<string> {
  if (!OPENROUTER_API_KEY) return text;

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
          { role: "system", content: prompt || DEFAULT_PROMPT },
          { role: "user", content: text },
        ],
        max_tokens: 800,
        temperature: 0.8,
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
