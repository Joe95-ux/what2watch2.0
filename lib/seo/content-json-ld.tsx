import { absoluteUrl } from "@/lib/site-url";
import { createContentSlug } from "@/lib/content-slug";
import { tmdbPosterUrl } from "@/lib/seo/metadata";

type ContentJsonLdProps = {
  type: "movie" | "tv";
  id: number;
  title: string;
  overview?: string | null;
  posterPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number;
  voteCount?: number;
};

export function ContentDetailJsonLd({
  type,
  id,
  title,
  overview,
  posterPath,
  releaseDate,
  voteAverage,
  voteCount,
}: ContentJsonLdProps) {
  const slug = createContentSlug(title);
  const path = `/${type}/${id}/${slug}`;
  const url = absoluteUrl(path);
  const image = tmdbPosterUrl(posterPath, "w500");

  const schemaType = type === "movie" ? "Movie" : "TVSeries";
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: title,
    url,
    ...(overview?.trim() ? { description: overview.trim() } : {}),
    ...(image ? { image } : {}),
    ...(releaseDate ? { datePublished: releaseDate } : {}),
  };

  if (
    voteAverage != null &&
    voteCount != null &&
    voteCount > 0 &&
    !Number.isNaN(voteAverage)
  ) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: voteAverage,
      ratingCount: voteCount,
      bestRating: 10,
      worstRating: 0,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
