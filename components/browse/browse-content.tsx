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
import { usePublicLists } from "@/components/lists/public-lists-content";
import ContentRow from "./content-row";
import LazyContentRow from "./lazy-content-row";
import PlaylistRow from "./playlist-row";
import HeroSection from "./hero-section";
import RecentlyViewed from "./recently-viewed";
import QuickFilters from "./quick-filters";
import IntentSection from "./intent-section";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Moon, Heart, Users, Clock, Calendar, Film } from "lucide-react";

interface BrowseContentProps {
  favoriteGenres: number[];
  preferredTypes: ("movie" | "tv")[];
}

export default function BrowseContent({ favoriteGenres, preferredTypes }: BrowseContentProps) {
  const { user } = useUser();
  const displayName = user?.fullName || user?.firstName || "You";
  
  // Quick filters state
  const [moodFilter, setMoodFilter] = useState<"any" | "light" | "dark" | "funny" | "serious" | "romantic" | "thrilling">("any");
  const [durationFilter, setDurationFilter] = useState<"any" | "quick" | "medium" | "long">("any");
  const [yearFilter, setYearFilter] = useState<"any" | "recent" | "2010s" | "2000s" | "classic">("any");
  
  // Fetch critical data immediately (above fold)
  const { data: popularMovies = [], isLoading: isLoadingPopularMovies } = usePopularMovies(1);
  const { data: popularTV = [], isLoading: isLoadingPopularTV } = usePopularTV(1); // Needed for hero
  const { data: personalizedContent = [], isLoading: isLoadingPersonalized } = usePersonalizedContent(
    favoriteGenres,
    preferredTypes.length > 0 ? preferredTypes : ["movie", "tv"]
  );
  const { data: trendingMovies = [], isLoading: isLoadingTrendingMovies } = useTrendingMovies("week", 1);
  
  // Fetch below-fold data (will be lazy-loaded)
  const { data: nowPlayingMovies = [], isLoading: isLoadingNowPlaying } = useNowPlayingMovies(1);
  const { data: onTheAirTV = [], isLoading: isLoadingOnTheAir } = useOnTheAirTV(1);
  const { data: trendingTV = [], isLoading: isLoadingTrendingTV } = useTrendingTV("week", 1);
  const { data: allGenres = [] } = useAllGenres();
  const { data: publicPlaylists = [], isLoading: isLoadingPublicPlaylists } = usePublicPlaylists(20);
  const { data: publicLists = [], isLoading: isLoadingPublicLists } = usePublicLists(10);

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

      {/* Quick Filters Bar */}
      <div className="w-full relative z-10 border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-[65px]">
        <QuickFilters
          onMoodChange={setMoodFilter}
          onDurationChange={setDurationFilter}
          onYearChange={setYearFilter}
          onSurpriseMe={() => {
            // Random recommendation logic
            const randomIntent = ["tonight", "date-night", "family", "quick", "weekend"][
              Math.floor(Math.random() * 5)
            ] as "tonight" | "date-night" | "family" | "quick" | "weekend";
            // Scroll to intent section or trigger random recommendation
          }}
        />
      </div>

      {/* Content Rows - Redesigned Layout */}
      <div className="w-full py-8 overflow-hidden relative z-10">
        {/* Made for [Username] Section - Above fold */}
        {favoriteGenres && favoriteGenres.length > 0 && (
          <ContentRow
            title={`Made for ${displayName}`}
            items={uniquePersonalizedContent}
            type={preferredTypes.length === 1 ? preferredTypes[0] : "movie"}
            isLoading={isLoadingPersonalized}
            href="/browse/personalized"
          />
        )}

        {/* Intent-Based Discovery Sections */}
        <IntentSection
          intent="tonight"
          title="What to Watch Tonight"
          description="Perfect picks for your evening viewing"
          favoriteGenres={favoriteGenres}
          preferredTypes={preferredTypes.length > 0 ? preferredTypes : ["movie", "tv"]}
          icon={<Moon className="h-6 w-6 text-primary" />}
        />

        <IntentSection
          intent="date-night"
          title="Perfect for Date Night"
          description="Romantic and engaging picks for two"
          favoriteGenres={favoriteGenres}
          preferredTypes={preferredTypes.length > 0 ? preferredTypes : ["movie", "tv"]}
          icon={<Heart className="h-6 w-6 text-primary" />}
        />

        <IntentSection
          intent="family"
          title="Family-Friendly"
          description="Great for watching together"
          favoriteGenres={favoriteGenres}
          preferredTypes={preferredTypes.length > 0 ? preferredTypes : ["movie", "tv"]}
          icon={<Users className="h-6 w-6 text-primary" />}
        />

        <IntentSection
          intent="quick"
          title="Quick Watch"
          description="Perfect for a short break"
          favoriteGenres={favoriteGenres}
          preferredTypes={preferredTypes.length > 0 ? preferredTypes : ["movie", "tv"]}
          icon={<Clock className="h-6 w-6 text-primary" />}
        />

        {/* Trending Section - Above fold */}
        {(trendingMoviesUnique.length > 0 || isLoadingTrendingMovies) && (
          <ContentRow
            title="Trending Now"
            items={trendingMoviesUnique}
            type="movie"
            isLoading={isLoadingTrendingMovies}
            href="/browse/movies/trending"
          />
        )}

        {/* Community Recommendations */}
        {publicLists.length > 0 && (
          <div className="mb-12 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 mb-6">
              <Users className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-medium text-foreground">Community Favorites</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {publicLists.slice(0, 10).map((list) => (
                <div key={list.id} className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                  {/* List card preview - simplified for now */}
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Film className="h-8 w-8 text-primary/50" />
                  </div>
                </div>
              ))}
            </div>
          </div>
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

        {/* Lazy-loaded sections (below fold) */}
        <LazyContentRow
          title="Popular Movies"
          items={popularMoviesUnique}
          type="movie"
          isLoading={isLoadingPopularMovies}
          href="/browse/movies/popular"
        />

        <LazyContentRow
          title="Latest Movies"
          items={nowPlayingMoviesUnique}
          type="movie"
          isLoading={isLoadingNowPlaying}
          href="/browse/movies/latest"
        />

        <LazyContentRow
          title="Trending TV Shows"
          items={trendingTVUnique}
          type="tv"
          isLoading={isLoadingTrendingTV}
          href="/browse/tv/trending"
        />

        <LazyContentRow
          title="Popular TV Shows"
          items={popularTVUnique}
          type="tv"
          isLoading={isLoadingPopularTV}
          href="/browse/tv/popular"
        />

        <LazyContentRow
          title="Latest TV Shows"
          items={onTheAirTVUnique}
          type="tv"
          isLoading={isLoadingOnTheAir}
          href="/browse/tv/latest"
        />

        {/* Genre Sections - Lazy loaded */}
        {topGenres.map((genre) => (
          <LazyGenreRow
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

// Lazy-loaded Genre Row Component
function LazyGenreRow({
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
    <LazyContentRow
      title={genreName}
      items={uniqueGenreMovies}
      type="movie"
      isLoading={isLoading}
      href={`/browse/genre/${genreId}`}
    />
  );
}
