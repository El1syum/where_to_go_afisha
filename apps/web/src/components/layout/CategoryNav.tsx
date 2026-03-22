"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

interface Category {
  slug: string;
  name: string;
  icon: string | null;
}

interface CategoryNavProps {
  categories: Category[];
}

export function CategoryNav({ categories }: CategoryNavProps) {
  const params = useParams();
  const citySlug = params?.city as string;
  const activeCategory = params?.category as string | undefined;

  return (
    <nav className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4">
        <div className="-mb-px flex gap-1 overflow-x-auto py-2 scrollbar-hide">
          <Link
            href={`/${citySlug}`}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              !activeCategory
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            Все
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/${citySlug}/${cat.slug}`}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat.slug
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {cat.icon && <span className="mr-1">{cat.icon}</span>}
              {cat.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
