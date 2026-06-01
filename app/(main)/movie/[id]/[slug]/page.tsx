import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMovieDetails } from "@/lib/tmdb";
import ContentDetailPage from "@/components/content-detail/content-detail-page";
import { TMDBMovie } from "@/lib/tmdb";
import { createContentSlug } from "@/lib/content-slug";
import { buildContentDetailMetadata } from "@/lib/seo/metadata";
import { ContentDetailJsonLd } from "@/lib/seo/content-json-ld";

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
    return buildContentDetailMetadata({
      type: "movie",
      id: movieId,
      title: movie.title,
      overview: movie.overview,
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
    });
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

    return (
      <>
        <ContentDetailJsonLd
          type="movie"
          id={movie.id}
          title={movie.title}
          overview={movie.overview}
          posterPath={movie.poster_path}
          releaseDate={movie.release_date}
          voteAverage={movie.vote_average}
          voteCount={movie.vote_count}
        />
        <ContentDetailPage item={item} type="movie" />
      </>
    );
  } catch (error) {
    console.error("Error fetching movie details:", error);
    notFound();
  }
}
