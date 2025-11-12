"use client";

import { usePopularMovies, useNowPlayingMovies, usePersonalizedContent, useMoviesByGenre } from "@/hooks/use-movies";
import { useAllGenres } from "@/hooks/use-genres";
import ContentRow from "./content-row";
import HeroSection from "./hero-section";
import RecentlyViewed from "./recently-viewed";
import { TMDBMovie } from "@/lib/tmdb";

interface MoviesContentProps {
  favoriteGenres: number[];
  preferredTypes: ("movie" | "tv")[];
}

export default function MoviesContent({ favoriteGenres, preferredTypes }: MoviesContentProps) {
  // Fetch all data with TanStack Query
  const { data: popularMovies = [], isLoading: isLoadingPopularMovies } = usePopularMovies(1);
  const { data: nowPlayingMovies = [], isLoading: isLoadingNowPlaying } = useNowPlayingMovies(1);
  // Filter personalized content to only movies
  const { data: allPersonalized = [], isLoading: isLoadingPersonalized } = usePersonalizedContent(
    favoriteGenres,
    preferredTypes.length > 0 ? preferredTypes.filter(t => t === "movie") : ["movie"]
  );
  const personalizedMovies = allPersonalized.filter((item): item is TMDBMovie => "title" in item);
  const { data: allGenres = [] } = useAllGenres();

  // Featured items for hero carousel (only movies)
  const featuredItems: TMDBMovie[] = popularMovies.slice(0, 5) || [];
  const featuredMovie: TMDBMovie | null = popularMovies[0] || null;

  // Get movie genres only (filter out TV-only genres if needed)
  // For simplicity, we'll use all genres but only show movie sections
  const topGenres = allGenres.slice(0, 6);

  return (
    <div className="min-h-screen bg-background relative">
      {/* 100vh dark overlay for blending (positioned at page level) */}
      <div className="absolute top-0 left-0 right-0 h-screen pointer-events-none z-0">
        <div className="h-full bg-gradient-to-b from-black via-black/80 to-transparent" />
        <div className="absolute inset-0 h-full bg-gradient-to-b from-transparent via-transparent to-background/20 dark:block hidden" />
      </div>
      
      {/* Hero Section - 80vh */}
      <HeroSection
        featuredItem={featuredMovie}
        featuredItems={featuredItems.length > 0 ? featuredItems : undefined}
        isLoading={isLoadingPopularMovies}
      />

      {/* Content Rows - Normal positioning */}
      <div className="w-full py-8 overflow-hidden relative z-10">
        {/* Personalized Section */}
        {favoriteGenres && favoriteGenres.length > 0 && (personalizedMovies.length > 0 || isLoadingPersonalized) && (
          <ContentRow
            title="We Think You'll Love This"
            items={personalizedMovies}
            type="movie"
            isLoading={isLoadingPersonalized}
            href="/browse/personalized"
          />
        )}

        {/* Popular Movies */}
        <ContentRow
          title="Popular Movies"
          items={popularMovies}
          type="movie"
          isLoading={isLoadingPopularMovies}
          href="/browse/movies/popular"
        />

        {/* Latest Movies */}
        <ContentRow
          title="Latest Movies"
          items={nowPlayingMovies}
          type="movie"
          isLoading={isLoadingNowPlaying}
          href="/browse/movies/latest"
        />

        {/* Genre Sections */}
        {topGenres.map((genre) => (
          <GenreRow key={genre.id} genreId={genre.id} genreName={genre.name} />
        ))}

        {/* Recently Viewed Section */}
        <RecentlyViewed />
      </div>
    </div>
  );
}

// Genre Row Component
function GenreRow({ genreId, genreName }: { genreId: number; genreName: string }) {
  const { data: genreMovies = [], isLoading } = useMoviesByGenre(genreId, 1);

  if (genreMovies.length === 0 && !isLoading) {
    return null;
  }

  return (
    <ContentRow
      title={genreName}
      items={genreMovies}
      type="movie"
      isLoading={isLoading}
      href={`/browse/genre/${genreId}`}
    />
  );
}

