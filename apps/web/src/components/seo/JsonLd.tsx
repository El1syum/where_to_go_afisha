interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function eventJsonLd(event: {
  title: string;
  description: string | null;
  date: Date | string;
  place: string | null;
  price: number | string | null;
  imageUrl: string | null;
  affiliateUrl: string | null;
  cityName: string;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: typeof event.date === "string" ? event.date : event.date.toISOString(),
    location: {
      "@type": "Place",
      name: event.place || "Не указано",
      address: {
        "@type": "PostalAddress",
        addressLocality: event.cityName,
        addressCountry: "RU",
      },
    },
  };

  if (event.description) {
    schema.description = event.description.substring(0, 500);
  }

  if (event.imageUrl) {
    schema.image = event.imageUrl;
  }

  if (event.price != null) {
    const priceNum = typeof event.price === "string" ? parseFloat(event.price) : event.price;
    if (!isNaN(priceNum) && priceNum > 0) {
      schema.offers = {
        "@type": "Offer",
        price: priceNum.toString(),
        priceCurrency: "RUB",
        url: event.affiliateUrl || undefined,
        availability: "https://schema.org/InStock",
      };
    }
  }

  return schema;
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
