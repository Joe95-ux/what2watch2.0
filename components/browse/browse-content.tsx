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
import { useMemo, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSearch } from "@/hooks/use-search";
import ListCard from "./list-card";
import PlaylistCard from "./playlist-card";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { List } from "@/hooks/use-lists";
import { Playlist } from "@/hooks/use-playlists";

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
      serious: [18, 36], // Drama, History
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
        <div className="mb-12 px-4 sm:px-6 lg:px-8">
          <Tabs value={popularTab} onValueChange={(v) => setPopularTab(v as "movies" | "tv")}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-medium text-foreground">Popular</h2>
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
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 5,
    breakpoints: {
      "(max-width: 640px)": { slidesToScroll: 2 },
      "(max-width: 1024px)": { slidesToScroll: 3 },
      "(max-width: 1280px)": { slidesToScroll: 4 },
    },
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const updateScrollState = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };
    updateScrollState();
    emblaApi.on("select", updateScrollState);
    emblaApi.on("reInit", updateScrollState);
    return () => {
      emblaApi.off("select", updateScrollState);
      emblaApi.off("reInit", updateScrollState);
    };
  }, [emblaApi]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  // Combine lists and playlists
  const allItems = [
    ...lists.map((list) => ({ type: "list" as const, data: list })),
    ...playlists.map((playlist) => ({ type: "playlist" as const, data: playlist })),
  ].slice(0, 20);

  if (allItems.length === 0) return null;

  return (
    <div className="mb-12 px-4 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-medium text-foreground mb-6">Explore Curated Lists</h2>
      <div className="relative">
        {canScrollPrev && (
          <button
            onClick={scrollPrev}
            className={cn(
              "absolute left-0 top-0 h-full z-40",
              "w-[45px] flex items-center justify-center",
              "bg-black/60 hover:bg-black/80 backdrop-blur-sm",
              "rounded-l-lg rounded-r-none border-0 cursor-pointer transition-all duration-200",
              "hidden md:flex"
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
        )}
        {canScrollNext && (
          <button
            onClick={scrollNext}
            className={cn(
              "absolute right-0 top-0 h-full z-40",
              "w-[45px] flex items-center justify-center",
              "bg-black/60 hover:bg-black/80 backdrop-blur-sm",
              "rounded-r-lg rounded-l-none border-0 cursor-pointer transition-all duration-200",
              "hidden md:flex"
            )}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        )}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-3">
            {allItems.map((item) => (
              <div key={`${item.type}-${item.data.id}`} className="flex-shrink-0 w-[180px] sm:w-[200px] overflow-hidden">
                {item.type === "list" ? (
                  <ListCard list={item.data} variant="carousel" />
                ) : (
                  <PlaylistCard playlist={item.data} variant="carousel" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

