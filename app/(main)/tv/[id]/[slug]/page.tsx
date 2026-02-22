import { notFound, redirect } from "next/navigation";
import { getTVDetails } from "@/lib/tmdb";
import ContentDetailPage from "@/components/content-detail/content-detail-page";
import { TMDBSeries } from "@/lib/tmdb";
import { createContentSlug } from "@/lib/content-slug";

interface PageProps {
  params: Promise<{ id: string; slug: string }>;
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
