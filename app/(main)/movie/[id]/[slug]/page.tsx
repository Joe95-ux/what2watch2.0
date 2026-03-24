import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMovieDetails } from "@/lib/tmdb";
import ContentDetailPage from "@/components/content-detail/content-detail-page";
import { TMDBMovie } from "@/lib/tmdb";
import { createContentSlug } from "@/lib/content-slug";
import { truncateMetaDescription } from "@/lib/content-detail-seo";

interface PageProps {
  params: Promise<{ id: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const movieId = parseInt(id, 10);
  if (isNaN(movieId)) {
    return { title: "Movie | What2Watch" };
  }
  try {
    const movie = await getMovieDetails(movieId);
    const title = `Where to Watch ${movie.title} | What2Watch`;
    const description =
      movie.overview?.trim()
        ? `Where to watch ${movie.title}. ${truncateMetaDescription(movie.overview)}`
        : `Where to watch ${movie.title} — streaming, buy, and rent options on What2Watch.`;
    return {
      title,
      description,
      openGraph: { title, description },
      twitter: { card: "summary_large_image", title, description },
    };
  } catch {
    return { title: "Movie | What2Watch" };
  }
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { id, slug } = await params;
  const movieId = parseInt(id, 10);

  if (isNaN(movieId)) {
    notFound();
  }

  try {
    const movie = await getMovieDetails(movieId);
    
    // Generate expected slug from title
    const expectedSlug = createContentSlug(movie.title);
    
    // If slug doesn't match, redirect to correct URL
    if (slug !== expectedSlug) {
      redirect(`/movie/${movieId}/${expectedSlug}`);
    }
    
    // Convert to TMDBMovie format for the component
    const item: TMDBMovie = {
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      release_date: movie.release_date,
      vote_average: movie.vote_average,
      vote_count: movie.vote_count,
      genre_ids: movie.genres?.map((g) => g.id) || [],
      popularity: movie.popularity || 0,
      adult: movie.adult || false,
      original_language: movie.original_language || "",
      original_title: movie.original_title || movie.title,
    };

    return <ContentDetailPage item={item} type="movie" />;
  } catch (error) {
    console.error("Error fetching movie details:", error);
    notFound();
  }
}
