import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import { ReviewActions } from "@/components/admin/ReviewActions";

export default async function AdminReviewsPage() {
  await requireAdmin();

  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      event: { select: { title: true, slug: true, city: { select: { slug: true } }, category: { select: { slug: true } } } },
    },
  });

  const pending = reviews.filter((r) => !r.isApproved);
  const approved = reviews.filter((r) => r.isApproved);

  return (
    <AdminShell>
      <h1 className="mb-6 text-2xl font-bold">Отзывы</h1>

      {/* Pending */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">На модерации ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет отзывов на модерации</p>
        ) : (
          <div className="space-y-3">
            {pending.map((review) => (
              <div key={review.id} className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{review.author}</span>
                      <span className="text-sm text-yellow-600">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                    </div>
                    <a
                      href={`/${review.event.city.slug}/${review.event.category.slug}/${review.event.slug}`}
                      className="text-xs text-primary hover:underline"
                      target="_blank"
                    >
                      {review.event.title}
                    </a>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {review.createdAt.toLocaleDateString("ru-RU")}
                  </span>
                </div>
                <p className="mb-3 text-sm">{review.text}</p>
                <ReviewActions reviewId={review.id} status="pending" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Одобренные ({approved.length})</h2>
        {approved.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет одобренных отзывов</p>
        ) : (
          <div className="space-y-3">
            {approved.map((review) => (
              <div key={review.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{review.author}</span>
                      <span className="text-sm text-primary">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                    </div>
                    <a
                      href={`/${review.event.city.slug}/${review.event.category.slug}/${review.event.slug}`}
                      className="text-xs text-primary hover:underline"
                      target="_blank"
                    >
                      {review.event.title}
                    </a>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {review.createdAt.toLocaleDateString("ru-RU")}
                  </span>
                </div>
                <p className="mb-3 text-sm">{review.text}</p>
                <ReviewActions reviewId={review.id} status="approved" />
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
