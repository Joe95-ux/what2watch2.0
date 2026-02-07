"use client";

import {
  usePopularMovies,
  usePopularTV,
  useTopRatedMovies,
  useTopRatedTV,
  usePersonalizedContent,
} from "@/hooks/use-movies";
import { usePublicLists } from "@/components/lists/public-lists-content";
import { usePublicPlaylists } from "@/hooks/use-playlists";
import ContentRow from "./content-row";
import RecentlyViewed from "./recently-viewed";
import QuickFilters, { MoodFilter, DurationFilter, YearFilter, RegionFilter } from "./quick-filters";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { useMemo, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSearch } from "@/hooks/use-search";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import ListCard from "./list-card";
import PlaylistCard from "./playlist-card";
import { ChevronRight as CaretRight, Youtube } from "lucide-react";
import Image from "next/image";
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
import { Button } from "../ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useYouTubeChannels } from "@/hooks/use-youtube-channels";
import { useWatchProviders } from "@/hooks/use-watch-providers";
import { YouTubeProfileSkeleton } from "./youtube-profile-skeleton";
import { getChannelProfilePath } from "@/lib/channel-path";
import StreamingServiceRow from "./streaming-service-row";

interface BrowseContentProps {
  favoriteGenres: number[];
  preferredTypes: ("movie" | "tv")[];
}

export default function BrowseContent({ favoriteGenres, preferredTypes }: BrowseContentProps) {
  const { user } = useUser();
  const displayName = user?.username || user?.fullName || user?.firstName || "You";
  
  // Load filters from localStorage on mount
  const loadFiltersFromStorage = (): {
    moodFilter: MoodFilter;
    durationFilter: DurationFilter;
    yearFilter: YearFilter;
    regionFilter: RegionFilter;
    nollywoodContentType: "movies" | "tv" | "youtube";
  } => {
    if (typeof window === "undefined") {
      return {
        moodFilter: "light",
        durationFilter: "any",
        yearFilter: "any",
        regionFilter: "any",
        nollywoodContentType: "movies",
      };
    }

    try {
      const saved = localStorage.getItem("browse-filters");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          moodFilter: parsed.moodFilter || "light",
          durationFilter: parsed.durationFilter || "any",
          yearFilter: parsed.yearFilter || "any",
          regionFilter: parsed.regionFilter || "any",
          nollywoodContentType: parsed.nollywoodContentType || "movies",
        };
      }
    } catch (error) {
      console.error("Error loading filters from localStorage:", error);
    }

    return {
      moodFilter: "light",
      durationFilter: "any",
      yearFilter: "any",
      regionFilter: "any",
      nollywoodContentType: "movies",
    };
  };

  const savedFilters = loadFiltersFromStorage();

  // Quick filters state - load from localStorage or use defaults
  const [moodFilter, setMoodFilter] = useState<MoodFilter>(savedFilters.moodFilter);
  const [durationFilter, setDurationFilter] = useState<DurationFilter>(savedFilters.durationFilter);
  const [yearFilter, setYearFilter] = useState<YearFilter>(savedFilters.yearFilter);
  const [regionFilter, setRegionFilter] = useState<RegionFilter>(savedFilters.regionFilter);
  const [popularTab, setPopularTab] = useState<"movies" | "tv">("movies");
  const [topRatedTab, setTopRatedTab] = useState<"movies" | "tv">("movies");
  const [nollywoodContentType, setNollywoodContentType] = useState<"movies" | "tv" | "youtube">(savedFilters.nollywoodContentType);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(
        "browse-filters",
        JSON.stringify({
          moodFilter,
          durationFilter,
          yearFilter,
          regionFilter,
          nollywoodContentType,
        })
      );
    } catch (error) {
      console.error("Error saving filters to localStorage:", error);
    }
  }, [moodFilter, durationFilter, yearFilter, regionFilter, nollywoodContentType]);
  
  // Fetch data
  const { data: popularMovies = [], isLoading: isLoadingPopularMovies } = usePopularMovies(1);
  const { data: popularTV = [], isLoading: isLoadingPopularTV } = usePopularTV(1);
  const { data: topRatedMoviesData, isLoading: isLoadingTopRatedMovies } = useTopRatedMovies(1);
  const { data: topRatedTVData, isLoading: isLoadingTopRatedTV } = useTopRatedTV(1);
  
  const topRatedMovies = topRatedMoviesData?.results || [];
  const topRatedTV = topRatedTVData?.results || [];
  const { data: personalizedContent = [], isLoading: isLoadingPersonalized } = usePersonalizedContent(
    favoriteGenres,
    preferredTypes.length > 0 ? preferredTypes : ["movie", "tv"]
  );
  const { data: publicLists = [] } = usePublicLists(10);
  const { data: publicPlaylists = [] } = usePublicPlaylists(10);
  const { data: watchProviders = [] } = useWatchProviders("US");
  const topStreamingProviders = watchProviders.slice(0, 5);

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

  // Build "View All" URL based on current filters
  const viewAllUrl = useMemo(() => {
    // Always navigate to /nollywood when Nollywood filter is active
    if (regionFilter === "nollywood") {
      return "/nollywood";
    }

    // Build search URL with current filters (only when NOT Nollywood)
    const params = new URLSearchParams();
    
    // Type
    if (preferredTypes.length > 0) {
      params.set("type", preferredTypes[0]);
    }

    // Genre (from mood filter)
    if (moodFilter !== "any") {
      const moodGenres = getMoodGenres(moodFilter);
      if (moodGenres.length > 0) {
        params.set("genre", moodGenres.join(","));
      }
      params.set("minRating", "6.5");
    }

    // Year
    if (yearFilter !== "any") {
      const currentYear = new Date().getFullYear();
      if (yearFilter === "recent") {
        params.set("year", String(currentYear - 2));
      } else if (yearFilter === "2010s") {
        params.set("year", "2015");
      } else if (yearFilter === "2000s") {
        params.set("year", "2005");
      } else if (yearFilter === "classic") {
        params.set("year", "1995");
      }
    }

    // Duration
    if (durationFilter !== "any") {
      if (durationFilter === "quick") {
        params.set("runtimeMax", "90");
      } else if (durationFilter === "medium") {
        params.set("runtimeMin", "90");
        params.set("runtimeMax", "120");
      } else if (durationFilter === "long") {
        params.set("runtimeMin", "120");
      }
    }

    params.set("sortBy", "popularity.desc");

    return `/search?${params.toString()}`;
  }, [moodFilter, durationFilter, yearFilter, regionFilter, preferredTypes]);

  // Build search params for filtered content (first section)
  const searchParams = useMemo(() => {
    const params: {
      type?: "movie" | "tv";
      minRating?: number;
      year?: string;
      sortBy?: string;
      genre?: number[];
      runtimeMin?: number;
      runtimeMax?: number;
      withOriginCountry?: string;
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

    // Duration filter - convert to runtime range
    if (durationFilter !== "any") {
      if (durationFilter === "quick") {
        params.runtimeMax = 90; // < 90 min
      } else if (durationFilter === "medium") {
        params.runtimeMin = 90;
        params.runtimeMax = 120; // 90-120 min
      } else if (durationFilter === "long") {
        params.runtimeMin = 120; // > 120 min
      }
    }

    // Region filter - Nollywood (Nigerian cinema)
    if (regionFilter === "nollywood") {
      params.withOriginCountry = "NG"; // Nigeria country code
      // Set type based on nollywoodContentType when Nollywood filter is active
      if (nollywoodContentType === "movies") {
        params.type = "movie";
      } else if (nollywoodContentType === "tv") {
        params.type = "tv";
      }
    }

    return params;
  }, [moodFilter, yearFilter, durationFilter, regionFilter, nollywoodContentType, preferredTypes]);

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
  const uniqueTopRatedMovies = filterUnique(topRatedMovies);
  const uniqueTopRatedTV = filterUnique(topRatedTV);

  return (
    <div className="min-h-screen bg-background">
      {/* Quick Filters Bar */}
      <div className="w-full border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-[64px] z-12">
        <div className="px-4 sm:px-6 lg:px-8">
          <QuickFilters
            initialMood={moodFilter}
            initialDuration={durationFilter}
            initialYear={yearFilter}
            initialRegion={regionFilter}
            onMoodChange={setMoodFilter}
            onDurationChange={setDurationFilter}
            onYearChange={setYearFilter}
            onRegionChange={setRegionFilter}
            onSurpriseMe={() => {
              // Random filter selection
              const moods: MoodFilter[] = ["light", "dark", "funny", "romantic", "thrilling"];
              const durations: DurationFilter[] = ["quick", "medium", "long"];
              const years: YearFilter[] = ["recent", "2010s", "2000s", "classic"];
              const regions: RegionFilter[] = ["any", "nollywood"];
              setMoodFilter(moods[Math.floor(Math.random() * moods.length)]);
              setDurationFilter(durations[Math.floor(Math.random() * durations.length)]);
              setYearFilter(years[Math.floor(Math.random() * years.length)]);
              setRegionFilter(regions[Math.floor(Math.random() * regions.length)]);
            }}
          />
        </div>
      </div>

      {/* Content Sections */}
      <div className="w-full py-8">
        {/* First Section - Affected by Quick Filters - Always visible */}
        {(uniqueFilteredContent.length > 0 || isLoadingFiltered || (regionFilter === "nollywood" && nollywoodContentType === "youtube")) && (
          <>
            {regionFilter === "nollywood" && nollywoodContentType === "youtube" ? (
              <NollywoodYouTubeSection onContentTypeChange={setNollywoodContentType} viewAllHref={viewAllUrl} />
            ) : (
              <ContentRow
                title="Discover"
                items={uniqueFilteredContent}
                type={regionFilter === "nollywood" && nollywoodContentType === "movies" ? "movie" : regionFilter === "nollywood" && nollywoodContentType === "tv" ? "tv" : (preferredTypes.length > 0 ? preferredTypes[0] : "movie")}
                isLoading={isLoadingFiltered}
                viewAllHref={viewAllUrl}
                titleAction={
                  regionFilter === "nollywood" ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          {nollywoodContentType === "movies" ? "Movies" : nollywoodContentType === "tv" ? "TV" : "YouTube"}
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setNollywoodContentType("movies")} className="cursor-pointer">
                          Movies
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setNollywoodContentType("tv")} className="cursor-pointer">
                          TV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setNollywoodContentType("youtube")} className="cursor-pointer">
                          YouTube
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : undefined
                }
              />
            )}
          </>
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

        {/* Streaming services (first five) */}
        {topStreamingProviders.map((provider) => (
          <StreamingServiceRow key={provider.provider_id} provider={provider} />
        ))}

        {/* Explore Curated Lists */}
        {(publicLists.length > 0 || publicPlaylists.length > 0) && (
          <CuratedListsSection lists={publicLists} playlists={publicPlaylists} />
        )}

        {/* Popular Section with Tabs */}
        <div className="mb-12">
          <Tabs value={popularTab} onValueChange={(v) => setPopularTab(v as "movies" | "tv")}>
            <div className="px-4 sm:px-6 lg:px-8 group flex items-center gap-4 mb-6">
              <Link 
                href="/popular"
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
                href="/popular?type=movies"
              />
            </TabsContent>
            <TabsContent value="tv">
              <ContentRow
                title=""
                items={uniquePopularTV}
                type="tv"
                isLoading={isLoadingPopularTV}
                href="/popular?type=tv"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Top Rated Section with Tabs */}
        <div className="mb-12">
          <Tabs value={topRatedTab} onValueChange={(v) => setTopRatedTab(v as "movies" | "tv")}>
            <div className="px-4 sm:px-6 lg:px-8 group flex items-center gap-4 mb-6">
              <Link 
                href={`/top-rated?type=${topRatedTab === "movies" ? "movies" : "tv"}`}
                className="inline-flex items-center gap-2 transition-all duration-300"
              >
                <h2 className="text-2xl font-medium text-foreground group-hover:text-primary transition-colors">
                  Top Rated
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
                items={uniqueTopRatedMovies}
                type="movie"
                isLoading={isLoadingTopRatedMovies}
                href="/top-rated?type=movies"
              />
            </TabsContent>
            <TabsContent value="tv">
              <ContentRow
                title=""
                items={uniqueTopRatedTV}
                type="tv"
                isLoading={isLoadingTopRatedTV}
                href="/top-rated?type=tv"
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

// Nollywood YouTube Section Component
function NollywoodYouTubeSection({ onContentTypeChange, viewAllHref }: { onContentTypeChange: (type: "movies" | "tv" | "youtube") => void; viewAllHref: string }) {
  return (
    <div className="mb-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-medium text-foreground">Discover</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                YouTube
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onContentTypeChange("movies")} className="cursor-pointer">
                Movies
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onContentTypeChange("tv")} className="cursor-pointer">
                TV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onContentTypeChange("youtube")} className="cursor-pointer">
                YouTube
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {viewAllHref && (
          <Link 
            href={viewAllHref} 
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            View All
            <CaretRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <YouTubeChannelsGrid />
    </div>
  );
}

// YouTube Channels Grid Component
function YouTubeChannelsGrid() {
  const { data: channels = [], isLoading } = useYouTubeChannels(true); // Only Nollywood channels

  if (isLoading) {
    return (
      <div className="relative group/carousel">
        <Carousel
          opts={{
            align: "start",
            slidesToScroll: 4,
            breakpoints: {
              "(max-width: 640px)": { slidesToScroll: 1 },
              "(max-width: 1024px)": { slidesToScroll: 3 },
              "(max-width: 1280px)": { slidesToScroll: 4 },
            },
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4 gap-4">
            {Array.from({ length: 12 }).map((_, idx) => (
              <CarouselItem key={idx} className="pl-2 md:pl-4 basis-[140px] sm:basis-[160px]">
                <div className="flex flex-col items-center gap-3">
                  <Skeleton className="w-32 h-32 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No YouTube channels found. Add channel IDs to see Nollywood channels.
      </div>
    );
  }

  return (
    <div className="relative group/carousel">
      <Carousel
        opts={{
          align: "start",
          slidesToScroll: 4,
          breakpoints: {
            "(max-width: 640px)": { slidesToScroll: 1 },
            "(max-width: 1024px)": { slidesToScroll: 3 },
            "(max-width: 1280px)": { slidesToScroll: 4 },
          },
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4 gap-4">
          {channels.map((channel) => (
            <CarouselItem key={channel.id} className="pl-2 md:pl-4 basis-[140px] sm:basis-[160px]">
              <button
                onClick={() => {
                  const path = getChannelProfilePath(channel.id, channel.slug);
                  window.location.href = path;
                }}
                className="group block text-center cursor-pointer w-full"
              >
                <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden mb-3 group-hover:scale-105 transition-transform">
                  {channel.thumbnail ? (
                    <Image
                      src={channel.thumbnail}
                      alt={channel.title}
                      fill
                      className="object-cover"
                      sizes="128px"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 bg-muted flex items-center justify-center">
                      <Youtube className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                  {channel.title}
                </p>
              </button>
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
      <div className="mb-6">
        <Link 
          href="/browse/personalized"
          className="group/title inline-flex items-center gap-2 transition-all duration-300"
        >
          <h2 className="text-2xl font-medium text-foreground group-hover/title:text-primary transition-colors">
            Explore Curated Lists
          </h2>
          <CaretRight 
            className="h-5 w-5 text-muted-foreground opacity-0 -translate-x-2 group-hover/title:opacity-100 group-hover/title:translate-x-0 transition-all duration-300" 
          />
        </Link>
      </div>
      <div className="relative group/carousel">
        <Carousel
          opts={{
            align: "start",
            slidesToScroll: 1,
            breakpoints: {
              "(max-width: 600px)": { slidesToScroll: 1, dragFree: true }, // 1 item per view, dragFree for mobile
              "(min-width: 601px)": { slidesToScroll: 2 }, // 2 items per view
              "(min-width: 1025px)": { slidesToScroll: 3 }, // 3 items per view
              "(min-width: 1281px)": { slidesToScroll: 4 }, // 4 items per view
            },
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4 gap-0">
            {allItems.map((item) => (
              <CarouselItem key={`${item.type}-${item.data.id}`} className="pl-2 md:pl-4 basis-1/1 sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                {item.type === "list" ? (
                  <ListCard list={item.data} variant="carousel" />
                ) : (
                  <PlaylistCard playlist={item.data} variant="carousel" />
                )}
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious 
            className="left-0 h-[225px] w-[45px] rounded-l-lg rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
          />
          <CarouselNext 
            className="right-0 h-[225px] w-[45px] rounded-r-lg rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
          />
        </Carousel>
      </div>
    </div>
  );
}

