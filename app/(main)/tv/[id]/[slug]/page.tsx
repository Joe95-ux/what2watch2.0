import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTVDetails } from "@/lib/tmdb";
import ContentDetailPage from "@/components/content-detail/content-detail-page";
import { TMDBSeries } from "@/lib/tmdb";
import { createContentSlug } from "@/lib/content-slug";
import { truncateMetaDescription } from "@/lib/content-detail-seo";

interface PageProps {
  params: Promise<{ id: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const tvId = parseInt(id, 10);
  if (isNaN(tvId)) {
    return { title: "TV Show | What2Watch" };
  }
  try {
    const tv = await getTVDetails(tvId);
    const title = `Where to Watch ${tv.name} | What2Watch TV`;
    const description =
      tv.overview?.trim()
        ? `Where to watch ${tv.name}. ${truncateMetaDescription(tv.overview)}`
        : `Where to watch ${tv.name} — streaming, buy, and rent options on What2Watch.`;
    return {
      title,
      description,
      openGraph: { title, description },
      twitter: { card: "summary_large_image", title, description },
    };
  } catch {
    return { title: "TV Show | What2Watch" };
  }
}

export default async function TVDetailPage({ params }: PageProps) {
  const { id, slug } = await params;
  const tvId = parseInt(id, 10);

  if (isNaN(tvId)) {
    notFound();
  }

  try {
    const tv = await getTVDetails(tvId);
    
    // Generate expected slug from title
    const expectedSlug = createContentSlug(tv.name);
    
    // If slug doesn't match, redirect to correct URL
    if (slug !== expectedSlug) {
      redirect(`/tv/${tvId}/${expectedSlug}`);
    }
    
    // Convert to TMDBSeries format for the component
    const item: TMDBSeries = {
      id: tv.id,
      name: tv.name,
      overview: tv.overview,
      poster_path: tv.poster_path,
      backdrop_path: tv.backdrop_path,
      first_air_date: tv.first_air_date,
      vote_average: tv.vote_average,
      vote_count: tv.vote_count,
      genre_ids: tv.genres?.map((g) => g.id) || [],
      popularity: tv.popularity || 0,
      original_language: tv.original_language || "",
      original_name: tv.original_name || tv.name,
    };

    return <ContentDetailPage item={item} type="tv" />;
  } catch (error) {
    console.error("Error fetching TV details:", error);
    notFound();
  }
}
