"use client";

import { usePopularTV, useOnTheAirTV, useTVByGenre, usePersonalizedContent } from "@/hooks/use-movies";
import { useAllGenres } from "@/hooks/use-genres";
import ContentRow from "./content-row";
import HeroSection from "./hero-section";
import RecentlyViewed from "./recently-viewed";
import { TMDBSeries } from "@/lib/tmdb";

interface TVContentProps {
  favoriteGenres: number[];
  preferredTypes: ("movie" | "tv")[];
}

export default function TVContent({ favoriteGenres, preferredTypes }: TVContentProps) {
  // Fetch all data with TanStack Query
  const { data: popularTV = [], isLoading: isLoadingPopularTV } = usePopularTV(1);
  const { data: onTheAirTV = [], isLoading: isLoadingOnTheAir } = useOnTheAirTV(1);
  // Filter personalized content to only TV shows
  const { data: allPersonalized = [], isLoading: isLoadingPersonalized } = usePersonalizedContent(
    favoriteGenres,
    preferredTypes.length > 0 ? preferredTypes.filter(t => t === "tv") : ["tv"]
  );
  const personalizedTV = allPersonalized.filter((item): item is TMDBSeries => "name" in item);
  const { data: allGenres = [] } = useAllGenres();

  // Featured items for hero carousel (only TV shows)
  const featuredItems: TMDBSeries[] = popularTV.slice(0, 5) || [];
  const featuredTV: TMDBSeries | null = popularTV[0] || null;

  // Get top genres for genre sections (limit to 6 most common genres)
  const topGenres = allGenres.slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HeroSection
        featuredItem={featuredTV}
        featuredItems={featuredItems.length > 0 ? featuredItems : undefined}
        isLoading={isLoadingPopularTV}
      />

      {/* Content Rows - Full width, padding handled by ContentRow */}
      <div className="w-full py-8 overflow-hidden">
        {/* Personalized Section */}
        {(favoriteGenres.length > 0 || isLoadingPersonalized) && (
          <ContentRow
            title="We Think You'll Love This"
            items={personalizedTV}
            type="tv"
            isLoading={isLoadingPersonalized}
            href="/browse/personalized"
          />
        )}

        {/* Popular TV Shows */}
        <ContentRow
          title="Popular TV Shows"
          items={popularTV}
          type="tv"
          isLoading={isLoadingPopularTV}
          href="/browse/tv/popular"
        />

        {/* Latest TV Shows */}
        <ContentRow
          title="Latest TV Shows"
          items={onTheAirTV}
          type="tv"
          isLoading={isLoadingOnTheAir}
          href="/browse/tv/latest"
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
  const { data: genreTV = [], isLoading } = useTVByGenre(genreId, 1);

  if (genreTV.length === 0 && !isLoading) {
    return null;
  }

  return (
    <ContentRow
      title={genreName}
      items={genreTV}
      type="tv"
      isLoading={isLoading}
      href={`/browse/genre/${genreId}`}
    />
  );
}

