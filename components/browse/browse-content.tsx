"use client";

import {
  usePopularMovies,
  useNowPlayingMovies,
  usePopularTV,
  useOnTheAirTV,
  usePersonalizedContent,
  useMoviesByGenre,
  useTrendingMovies,
  useTrendingTV,
} from "@/hooks/use-movies";
import { useAllGenres } from "@/hooks/use-genres";
import { usePublicPlaylists } from "@/hooks/use-playlists";
import ContentRow from "./content-row";
import PlaylistRow from "./playlist-row";
import HeroSection from "./hero-section";
import RecentlyViewed from "./recently-viewed";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { useMemo } from "react";

interface BrowseContentProps {
  favoriteGenres: number[];
  preferredTypes: ("movie" | "tv")[];
}

export default function BrowseContent({ favoriteGenres, preferredTypes }: BrowseContentProps) {
  // Fetch all data with TanStack Query
  const { data: popularMovies = [], isLoading: isLoadingPopularMovies } = usePopularMovies(1);
  const { data: nowPlayingMovies = [], isLoading: isLoadingNowPlaying } = useNowPlayingMovies(1);
  const { data: trendingMovies = [], isLoading: isLoadingTrendingMovies } = useTrendingMovies("week", 1);
  const { data: popularTV = [], isLoading: isLoadingPopularTV } = usePopularTV(1);
  const { data: onTheAirTV = [], isLoading: isLoadingOnTheAir } = useOnTheAirTV(1);
  const { data: trendingTV = [], isLoading: isLoadingTrendingTV } = useTrendingTV("week", 1);
  const { data: personalizedContent = [], isLoading: isLoadingPersonalized } = usePersonalizedContent(
    favoriteGenres,
    preferredTypes.length > 0 ? preferredTypes : ["movie", "tv"] // Default to both if empty
  );
  const { data: allGenres = [] } = useAllGenres();
  const { data: publicPlaylists = [], isLoading: isLoadingPublicPlaylists } = usePublicPlaylists(20);

  // Featured items for hero carousel (mix of popular movies and TV shows)
  const featuredItems: (TMDBMovie | TMDBSeries)[] = [
    ...(popularMovies.slice(0, 3) || []),
    ...(popularTV.slice(0, 2) || []),
  ].filter(Boolean);
  const featuredMovie: TMDBMovie | null = popularMovies[0] || null;

  // Get top genres for genre sections (limit to 6 most common genres)
  const topGenres = allGenres.slice(0, 6);

  // Track seen items to reduce duplicates across rows
  const seenMovieIds = new Set<number>();
  const seenTVIds = new Set<number>();
  // Separate Set for Latest TV Shows to avoid filtering out items that appear in Popular TV Shows
  const seenLatestTVIds = new Set<number>();

  const filterMoviesUnique = (items: TMDBMovie[], limit?: number) => {
    const source = limit ? items.slice(0, limit) : items;
    return source.filter((movie) => {
      if (seenMovieIds.has(movie.id)) return false;
      seenMovieIds.add(movie.id);
      return true;
    });
  };

  const filterTVUnique = (items: TMDBSeries[], limit?: number) => {
    const source = limit ? items.slice(0, limit) : items;
    return source.filter((show) => {
      if (seenTVIds.has(show.id)) return false;
      seenTVIds.add(show.id);
      return true;
    });
  };

  // Filter Latest TV Shows separately to avoid conflicts with Popular TV Shows
  const filterLatestTVUnique = (items: TMDBSeries[], limit?: number) => {
    const source = limit ? items.slice(0, limit) : items;
    return source.filter((show) => {
      if (seenLatestTVIds.has(show.id)) return false;
      seenLatestTVIds.add(show.id);
      return true;
    });
  };

  const filterMixedUnique = (items: (TMDBMovie | TMDBSeries)[], limit?: number) => {
    const source = limit ? items.slice(0, limit) : items;
    return source.filter((item) => {
      if ("title" in item) {
        if (seenMovieIds.has(item.id)) return false;
        seenMovieIds.add(item.id);
      } else {
        if (seenTVIds.has(item.id)) return false;
        seenTVIds.add(item.id);
      }
      return true;
    });
  };

  const uniquePersonalizedContent = filterMixedUnique(personalizedContent, 20);
  const trendingMoviesUnique = filterMoviesUnique(trendingMovies, 20);
  const trendingTVUnique = filterTVUnique(trendingTV, 20);
  const popularMoviesUnique = filterMoviesUnique(popularMovies);
  const popularTVUnique = filterTVUnique(popularTV);
  const nowPlayingMoviesUnique = filterMoviesUnique(nowPlayingMovies);
  // Use separate filter for Latest TV Shows to avoid conflicts with Popular TV Shows
  const onTheAirTVUnique = filterLatestTVUnique(onTheAirTV);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HeroSection
        featuredItem={featuredMovie}
        featuredItems={featuredItems.length > 0 ? featuredItems : undefined}
        isLoading={isLoadingPopularMovies}
      />

      {/* Content Rows - Full width, padding handled by ContentRow */}
      <div className="w-full py-8 overflow-hidden">
        {/* Personalized Section */}
        {(uniquePersonalizedContent.length > 0 || isLoadingPersonalized || favoriteGenres.length > 0) && (
          <ContentRow
            title="We Think You'll Love This"
            items={uniquePersonalizedContent}
            type={preferredTypes.length === 1 ? preferredTypes[0] : "movie"} // Use first type or default to movie for mixed content
            isLoading={isLoadingPersonalized}
            href="/browse/personalized"
          />
        )}

        {/* Explore Public Playlists */}
        {publicPlaylists.length > 0 && (
          <PlaylistRow
            title="Explore Public Playlists"
            playlists={publicPlaylists}
            isLoading={isLoadingPublicPlaylists}
            href="/playlists"
          />
        )}

        {/* Trending Movies */}
        {(trendingMoviesUnique.length > 0 || isLoadingTrendingMovies) && (
          <ContentRow
            title="Trending Movies"
            items={trendingMoviesUnique}
            type="movie"
            isLoading={isLoadingTrendingMovies}
            href="/browse/movies/trending"
          />
        )}

        {/* Trending TV Shows */}
        {(trendingTVUnique.length > 0 || isLoadingTrendingTV) && (
          <ContentRow
            title="Trending TV Shows"
            items={trendingTVUnique}
            type="tv"
            isLoading={isLoadingTrendingTV}
            href="/browse/tv/trending"
          />
        )}

        {/* Popular Movies */}
        <ContentRow
          title="Popular Movies"
          items={popularMoviesUnique}
          type="movie"
          isLoading={isLoadingPopularMovies}
          href="/browse/movies/popular"
        />

        {/* Latest Movies */}
        <ContentRow
          title="Latest Movies"
          items={nowPlayingMoviesUnique}
          type="movie"
          isLoading={isLoadingNowPlaying}
          href="/browse/movies/latest"
        />

        {/* Popular TV Shows */}
        <ContentRow
          title="Popular TV Shows"
          items={popularTVUnique}
          type="tv"
          isLoading={isLoadingPopularTV}
          href="/browse/tv/popular"
        />

        {/* Latest TV Shows */}
        <ContentRow
          title="Latest TV Shows"
          items={onTheAirTVUnique}
          type="tv"
          isLoading={isLoadingOnTheAir}
          href="/browse/tv/latest"
        />

        {/* Genre Sections */}
        {topGenres.map((genre) => (
          <GenreRow
            key={genre.id}
            genreId={genre.id}
            genreName={genre.name}
          />
        ))}

        {/* Recently Viewed Section */}
        <RecentlyViewed />
      </div>
    </div>
  );
}

// Genre Row Component
function GenreRow({
  genreId,
  genreName,
}: {
  genreId: number;
  genreName: string;
}) {
  const { data: genreMovies = [], isLoading } = useMoviesByGenre(genreId, 1);

  const uniqueGenreMovies = useMemo(() => {
    const seenIds = new Set<number>();
    return genreMovies.filter((movie) => {
      if (seenIds.has(movie.id)) return false;
      seenIds.add(movie.id);
      return true;
    });
  }, [genreMovies]);

  if (uniqueGenreMovies.length === 0 && !isLoading) {
    return null;
  }

  return (
    <ContentRow
      title={genreName}
      items={uniqueGenreMovies}
      type="movie"
      isLoading={isLoading}
      href={`/browse/genre/${genreId}`}
    />
  );
}
