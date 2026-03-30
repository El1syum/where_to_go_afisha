"use client";

import { useEffect, useState, FormEvent } from "react";

interface Review {
  id: number;
  author: string;
  rating: number;
  text: string;
  createdAt: string;
}

function Stars({
  rating,
  interactive = false,
  onSelect,
}: {
  rating: number;
  interactive?: boolean;
  onSelect?: (r: number) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onSelect?.(star)}
          className={`text-lg ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"} ${
            star <= rating ? "text-yellow-400" : "text-gray-300"
          }`}
          aria-label={`${star} из 5`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function formatReviewDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow",
  });
}

export function Reviews({ eventId }: { eventId: number }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/reviews?eventId=${eventId}`)
      .then((res) => res.json())
      .then((data) => setReviews(data.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!author.trim()) {
      setError("Укажите имя");
      return;
    }
    if (rating === 0) {
      setError("Поставьте оценку");
      return;
    }
    if (!text.trim()) {
      setError("Напишите отзыв");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: author.trim(), rating, text: text.trim(), eventId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ошибка при отправке");
        return;
      }
      setSubmitted(true);
      setAuthor("");
      setRating(0);
      setText("");
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-xl font-bold text-gray-900">Отзывы</h2>

      {loading ? (
        <p className="text-sm text-gray-500">Загрузка отзывов...</p>
      ) : reviews.length > 0 ? (
        <div className="mb-6 space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-2xl bg-white p-4 shadow-sm"
            >
              <div className="mb-1 flex items-center gap-3">
                <span className="font-semibold text-gray-900">{review.author}</span>
                <Stars rating={review.rating} />
              </div>
              <p className="mb-2 whitespace-pre-line text-sm text-gray-700">
                {review.text}
              </p>
              <p className="text-xs text-gray-400">
                {formatReviewDate(review.createdAt)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-6 text-sm text-gray-500">
          Пока нет отзывов. Будьте первым!
        </p>
      )}

      {submitted ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Спасибо! Ваш отзыв появится после модерации.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-gray-900">Оставить отзыв</h3>

          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">Ваше имя</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Имя"
              maxLength={100}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">Оценка</label>
            <Stars rating={rating} interactive onSelect={setRating} />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">Отзыв</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Расскажите о мероприятии..."
              rows={3}
              maxLength={2000}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="mb-3 text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
          >
            {submitting ? "Отправка..." : "Отправить"}
          </button>
        </form>
      )}
    </div>
  );
}
