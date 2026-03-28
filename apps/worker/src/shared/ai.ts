const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const DEFAULT_MODEL = "deepseek/deepseek-chat-v3-0324";

const DEFAULT_PROMPT = `Ты — талантливый копирайтер Telegram-канала афиши мероприятий. Пиши короткие, живые анонсы.

Формат: 2-4 предложения. Первое предложение — цепляющее, интригующее. Далее — суть мероприятия и почему стоит пойти.

Стиль: как будто рассказываешь другу, куда сходить. Естественно, без пафоса, без клише.

ЗАПРЕЩЕНО: «не пропустите», «уникальный шанс», «спешите», «погрузитесь», «окунитесь», эмодзи, хештеги, markdown.

Пример хорошего анонса:
Вход: Концерт Дмитрия Маликова в Крокус Сити Холле
Выход: Маликов возвращается на большую сцену с программой, где классика встречается с электроникой. Живой оркестр, рояль и визуальное шоу — три часа музыки, которая знакома каждому, но звучит совершенно по-новому.

Пример хорошего анонса:
Вход: Выставка Ван Гога на ВДНХ
Выход: Мультимедийная выставка, где картины Ван Гога оживают на стенах и полу зала. Эффект присутствия внутри «Звёздной ночи» — то, что сложно описать словами, но стоит увидеть хотя бы раз.`;

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
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!res.ok) return text;

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch {
    return text;
  }
}
