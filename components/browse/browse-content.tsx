"use client";

import { usePopularMovies, useNowPlayingMovies, usePopularTV, useOnTheAirTV, usePersonalizedMovies, useMoviesByGenre } from "@/hooks/use-movies";
import { useAllGenres } from "@/hooks/use-genres";
import ContentRow from "./content-row";
import HeroSection from "./hero-section";
import { TMDBMovie } from "@/lib/tmdb";

interface BrowseContentProps {
  favoriteGenres: number[];
}

export default function BrowseContent({ favoriteGenres }: BrowseContentProps) {
  // Fetch all data with TanStack Query
  const { data: popularMovies = [], isLoading: isLoadingPopularMovies } = usePopularMovies(1);
  const { data: nowPlayingMovies = [], isLoading: isLoadingNowPlaying } = useNowPlayingMovies(1);
  const { data: popularTV = [], isLoading: isLoadingPopularTV } = usePopularTV(1);
  const { data: onTheAirTV = [], isLoading: isLoadingOnTheAir } = useOnTheAirTV(1);
  const { data: personalizedMovies = [], isLoading: isLoadingPersonalized } = usePersonalizedMovies(
    favoriteGenres.length > 0 ? favoriteGenres[0] : null
  );
  const { data: allGenres = [] } = useAllGenres();

  // Featured item for hero (first popular movie)
  const featuredMovie: TMDBMovie | null = popularMovies[0] || null;

  // Get top genres for genre sections (limit to 6 most common genres)
  const topGenres = allGenres.slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HeroSection
        featuredItem={featuredMovie}
        type="movie"
        isLoading={isLoadingPopularMovies}
      />

      {/* Content Rows - Full width with padding */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Personalized Section */}
        {personalizedMovies.length > 0 && (
          <ContentRow
            title="We Think You'll Love This"
            items={personalizedMovies}
            type="movie"
            isLoading={isLoadingPersonalized}
          />
        )}

        {/* Popular Movies */}
        <ContentRow
          title="Popular Movies"
          items={popularMovies}
          type="movie"
          isLoading={isLoadingPopularMovies}
        />

        {/* Latest Movies */}
        <ContentRow
          title="Latest Movies"
          items={nowPlayingMovies}
          type="movie"
          isLoading={isLoadingNowPlaying}
        />

        {/* Popular TV Shows */}
        <ContentRow
          title="Popular TV Shows"
          items={popularTV}
          type="tv"
          isLoading={isLoadingPopularTV}
        />

        {/* Latest TV Shows */}
        <ContentRow
          title="Latest TV Shows"
          items={onTheAirTV}
          type="tv"
          isLoading={isLoadingOnTheAir}
        />

        {/* Genre Sections */}
        {topGenres.map((genre) => (
          <GenreRow key={genre.id} genreId={genre.id} genreName={genre.name} />
        ))}
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
    />
  );
}
