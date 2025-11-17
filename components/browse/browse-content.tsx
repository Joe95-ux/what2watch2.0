"use client";

import {
  usePopularMovies,
  usePopularTV,
  usePersonalizedContent,
} from "@/hooks/use-movies";
import { usePublicLists } from "@/components/lists/public-lists-content";
import { usePublicPlaylists } from "@/hooks/use-playlists";
import ContentRow from "./content-row";
import RecentlyViewed from "./recently-viewed";
import QuickFilters, { MoodFilter, DurationFilter, YearFilter } from "./quick-filters";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSearch } from "@/hooks/use-search";
import ListCard from "./list-card";
import PlaylistCard from "./playlist-card";
import { ChevronRight as CaretRight } from "lucide-react";
import { List } from "@/hooks/use-lists";
import { Playlist } from "@/hooks/use-playlists";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface BrowseContentProps {
  favoriteGenres: number[];
  preferredTypes: ("movie" | "tv")[];
}

export default function BrowseContent({ favoriteGenres, preferredTypes }: BrowseContentProps) {
  const { user } = useUser();
  const displayName = user?.fullName || user?.firstName || "You";
  
  // Quick filters state - first filter (light) active by default
  const [moodFilter, setMoodFilter] = useState<MoodFilter>("light");
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
  const { data: publicPlaylists = [] } = usePublicPlaylists(10);

  // Map mood filters to genre IDs
  const getMoodGenres = (mood: MoodFilter): number[] => {
    // TMDB genre IDs
    const moodGenreMap: Record<MoodFilter, number[]> = {
      any: [],
      light: [35, 10751, 16], // Comedy, Family, Animation
      dark: [27, 53, 80], // Horror, Thriller, Crime
      funny: [35], // Comedy
      romantic: [10749], // Romance
      thrilling: [28, 53, 12], // Action, Thriller, Adventure
    };
    return moodGenreMap[mood] || [];
  };

  // Build search params for filtered content (first section)
  const searchParams = useMemo(() => {
    const params: {
      type?: "movie" | "tv";
      minRating?: number;
      year?: string;
      sortBy?: string;
      genre?: number[];
    } = {
      type: preferredTypes.length > 0 ? (preferredTypes[0] as "movie" | "tv") : "movie",
      sortBy: "popularity.desc",
    };

    // Mood filter - use genre IDs
    if (moodFilter !== "any") {
      const moodGenres = getMoodGenres(moodFilter);
      if (moodGenres.length > 0) {
        params.genre = moodGenres;
      }
      params.minRating = 6.5; // Minimum quality threshold
    }

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

    return params;
  }, [moodFilter, yearFilter, preferredTypes]);

  // Fetch filtered content for first section - always enabled to show Discover section
  // Since moodFilter defaults to "light", we'll always have genre and minRating
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

  // Track seen items to reduce duplicates - use separate sets for each section
  // to prevent filters from affecting other sections
  const filterUnique = (items: (TMDBMovie | TMDBSeries)[], limit?: number) => {
    const seenIds = new Set<number>();
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
              const moods: MoodFilter[] = ["light", "dark", "funny", "romantic", "thrilling"];
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
        {/* First Section - Affected by Quick Filters - Always visible */}
        {(uniqueFilteredContent.length > 0 || isLoadingFiltered) && (
          <ContentRow
            title="Discover"
            items={uniqueFilteredContent}
            type={preferredTypes.length > 0 ? preferredTypes[0] : "movie"}
            isLoading={isLoadingFiltered}
          />
        )}

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
        {(publicLists.length > 0 || publicPlaylists.length > 0) && (
          <CuratedListsSection lists={publicLists} playlists={publicPlaylists} />
        )}

        {/* Popular Section with Tabs */}
        <div className="mb-12">
          <Tabs value={popularTab} onValueChange={(v) => setPopularTab(v as "movies" | "tv")}>
            <div className="px-4 sm:px-6 lg:px-8 group flex items-center gap-4 mb-6">
              <Link 
                href={popularTab === "movies" ? "/browse/movies/popular" : "/browse/tv/popular"}
                className="inline-flex items-center gap-2 transition-all duration-300"
              >
                <h2 className="text-2xl font-medium text-foreground group-hover:text-primary transition-colors">
                  Popular
                </h2>
                <CaretRight 
                  className="h-5 w-5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" 
                />
              </Link>
              <TabsList>
                <TabsTrigger value="movies">Movies</TabsTrigger>
                <TabsTrigger value="tv">TV Shows</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="movies">
              <ContentRow
                title=""
                items={uniquePopularMovies}
                type="movie"
                isLoading={isLoadingPopularMovies}
                href="/browse/movies/popular"
              />
            </TabsContent>
            <TabsContent value="tv">
              <ContentRow
                title=""
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

// Curated Lists Section Component
function CuratedListsSection({ lists, playlists }: { lists: List[]; playlists: Playlist[] }) {
  // Combine lists and playlists
  const allItems = [
    ...lists.map((list) => ({ type: "list" as const, data: list })),
    ...playlists.map((playlist) => ({ type: "playlist" as const, data: playlist })),
  ].slice(0, 20);

  if (allItems.length === 0) return null;

  return (
    <div className="mb-12 px-4 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-medium text-foreground mb-6">Explore Curated Lists</h2>
      <div className="relative group/carousel">
        <Carousel
          opts={{
            align: "start",
            slidesToScroll: 5,
            breakpoints: {
              "(max-width: 640px)": { slidesToScroll: 2 },
              "(max-width: 1024px)": { slidesToScroll: 3 },
              "(max-width: 1280px)": { slidesToScroll: 4 },
            },
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4 gap-3">
            {allItems.map((item) => (
              <CarouselItem key={`${item.type}-${item.data.id}`} className="pl-2 md:pl-4 basis-[180px] sm:basis-[200px]">
                {item.type === "list" ? (
                  <ListCard list={item.data} variant="carousel" />
                ) : (
                  <PlaylistCard playlist={item.data} variant="carousel" />
                )}
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious 
            className="left-0 h-full w-[45px] rounded-l-lg rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
          />
          <CarouselNext 
            className="right-0 h-full w-[45px] rounded-r-lg rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
          />
        </Carousel>
      </div>
    </div>
  );
}

