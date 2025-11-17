"use client";

import {
  usePopularMovies,
  usePopularTV,
  usePersonalizedContent,
} from "@/hooks/use-movies";
import { usePublicLists } from "@/components/lists/public-lists-content";
import ContentRow from "./content-row";
import RecentlyViewed from "./recently-viewed";
import QuickFilters, { MoodFilter, DurationFilter, YearFilter } from "./quick-filters";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSearch } from "@/hooks/use-search";

interface BrowseContentProps {
  favoriteGenres: number[];
  preferredTypes: ("movie" | "tv")[];
}

export default function BrowseContent({ favoriteGenres, preferredTypes }: BrowseContentProps) {
  const { user } = useUser();
  const displayName = user?.fullName || user?.firstName || "You";
  
  // Quick filters state
  const [moodFilter, setMoodFilter] = useState<MoodFilter>("any");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("any");
  const [yearFilter, setYearFilter] = useState<YearFilter>("any");
  const [popularTab, setPopularTab] = useState<"movies" | "tv">("movies");
  
  // Fetch data
  const { data: popularMovies = [], isLoading: isLoadingPopularMovies } = usePopularMovies(1);
  const { data: popularTV = [], isLoading: isLoadingPopularTV } = usePopularTV(1);
  const { data: personalizedContent = [], isLoading: isLoadingPersonalized } = usePersonalizedContent(
    favoriteGenres,
    preferredTypes.length > 0 ? preferredTypes : ["movie", "tv"]
  );
  const { data: publicLists = [] } = usePublicLists(10);

  // Build search params for filtered content (first section)
  const searchParams = useMemo(() => {
    const params: {
      type?: "movie" | "tv";
      minRating?: number;
      year?: string;
      sortBy?: string;
    } = {
      type: preferredTypes.length > 0 ? (preferredTypes[0] as "movie" | "tv") : "movie",
      sortBy: "popularity.desc",
    };

    // Year filter - use a representative year for the range
    if (yearFilter !== "any") {
      const currentYear = new Date().getFullYear();
      if (yearFilter === "recent") {
        params.year = String(currentYear - 2); // Use recent year
      } else if (yearFilter === "2010s") {
        params.year = "2015"; // Middle of the decade
      } else if (yearFilter === "2000s") {
        params.year = "2005"; // Middle of the decade
      } else if (yearFilter === "classic") {
        params.year = "1995"; // Representative classic year
      }
    }

    // Mood filter (approximate with rating)
    if (moodFilter !== "any") {
      params.minRating = 7; // Higher quality for mood-based recommendations
    }

    return params;
  }, [moodFilter, yearFilter, preferredTypes]);

  // Fetch filtered content for first section
  const { data: filteredContentData, isLoading: isLoadingFiltered } = useSearch({
    ...searchParams,
    page: 1,
  });

  const filteredContent = useMemo(() => {
    if (!filteredContentData?.results) return [];
    
    const items = filteredContentData.results;

    // Apply client-side year filtering for more precise ranges
    let filtered = items;
    if (yearFilter !== "any") {
      const currentYear = new Date().getFullYear();
      filtered = items.filter((item) => {
        const releaseYear = "release_date" in item && item.release_date
          ? new Date(item.release_date).getFullYear()
          : "first_air_date" in item && item.first_air_date
          ? new Date(item.first_air_date).getFullYear()
          : null;
        
        if (!releaseYear) return true;
        
        if (yearFilter === "recent") {
          return releaseYear >= currentYear - 5;
        } else if (yearFilter === "2010s") {
          return releaseYear >= 2010 && releaseYear <= 2019;
        } else if (yearFilter === "2000s") {
          return releaseYear >= 2000 && releaseYear <= 2009;
        } else if (yearFilter === "classic") {
          return releaseYear <= 1999;
        }
        return true;
      });
    }

    return filtered.slice(0, 20);
  }, [filteredContentData, yearFilter]);

  // Track seen items to reduce duplicates
  const seenIds = new Set<number>();

  const filterUnique = (items: (TMDBMovie | TMDBSeries)[], limit?: number) => {
    const source = limit ? items.slice(0, limit) : items;
    return source.filter((item) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });
  };

  const uniquePersonalizedContent = filterUnique(personalizedContent, 20);
  const uniqueFilteredContent = filterUnique(filteredContent, 20);
  const uniquePopularMovies = filterUnique(popularMovies);
  const uniquePopularTV = filterUnique(popularTV);

  return (
    <div className="min-h-screen bg-background">
      {/* Quick Filters Bar */}
      <div className="w-full border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-[65px] z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <QuickFilters
            onMoodChange={setMoodFilter}
            onDurationChange={setDurationFilter}
            onYearChange={setYearFilter}
            onSurpriseMe={() => {
              // Random filter selection
              const moods: MoodFilter[] = ["light", "dark", "funny", "serious", "romantic", "thrilling"];
              const durations: DurationFilter[] = ["quick", "medium", "long"];
              const years: YearFilter[] = ["recent", "2010s", "2000s", "classic"];
              setMoodFilter(moods[Math.floor(Math.random() * moods.length)]);
              setDurationFilter(durations[Math.floor(Math.random() * durations.length)]);
              setYearFilter(years[Math.floor(Math.random() * years.length)]);
            }}
          />
        </div>
      </div>

      {/* Content Sections */}
      <div className="w-full py-8">
        {/* First Section - Affected by Quick Filters */}
        <ContentRow
          title="Discover"
          items={uniqueFilteredContent}
          type={preferredTypes.length > 0 ? preferredTypes[0] : "movie"}
          isLoading={isLoadingFiltered}
        />

        {/* Made for [Username] Section */}
        {favoriteGenres && favoriteGenres.length > 0 && (
          <ContentRow
            title={`Made for ${displayName}`}
            items={uniquePersonalizedContent}
            type={preferredTypes.length === 1 ? preferredTypes[0] : "movie"}
            isLoading={isLoadingPersonalized}
            href="/browse/personalized"
          />
        )}

        {/* Explore Curated Lists */}
        {publicLists.length > 0 && (
          <div className="mb-12 px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-medium text-foreground mb-6">Explore Curated Lists</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {publicLists.slice(0, 10).map((list) => (
                <div key={list.id} className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                  {/* List card preview - simplified for now */}
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <span className="text-primary/50 text-sm">List</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Popular Section with Tabs */}
        <div className="mb-12 px-4 sm:px-6 lg:px-8">
          <Tabs value={popularTab} onValueChange={(v) => setPopularTab(v as "movies" | "tv")}>
            <TabsList className="mb-6">
              <TabsTrigger value="movies">Movies</TabsTrigger>
              <TabsTrigger value="tv">TV Shows</TabsTrigger>
            </TabsList>
            <TabsContent value="movies">
              <ContentRow
                title="Popular"
                items={uniquePopularMovies}
                type="movie"
                isLoading={isLoadingPopularMovies}
                href="/browse/movies/popular"
              />
            </TabsContent>
            <TabsContent value="tv">
              <ContentRow
                title="Popular"
                items={uniquePopularTV}
                type="tv"
                isLoading={isLoadingPopularTV}
                href="/browse/tv/popular"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Recently Viewed Section */}
        <RecentlyViewed />
      </div>
    </div>
  );
}

