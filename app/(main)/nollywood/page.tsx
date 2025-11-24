"use client";

import { useState, useEffect, useMemo } from "react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MovieCard from "@/components/browse/movie-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Youtube, ChevronDown } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { useYouTubeChannels } from "@/hooks/use-youtube-channels";
import { YouTubeProfileSkeleton } from "@/components/browse/youtube-profile-skeleton";
import { getChannelProfilePath } from "@/lib/channel-path";
import { useSearch } from "@/hooks/use-search";

type ContentFilter = "all" | "movies" | "tv";

export default function NollywoodPage() {
  const { data: channels = [], isLoading: isLoadingChannels } = useYouTubeChannels();
  
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Build search params for movies
  const moviesSearchParams = useMemo(() => {
    if (contentFilter === "tv") return null; // Don't fetch movies if only TV is selected
    return {
      type: "movie" as const,
      withOriginCountry: "NG",
      sortBy: "popularity.desc",
      page: currentPage,
    };
  }, [contentFilter, currentPage]);

  // Build search params for TV
  const tvSearchParams = useMemo(() => {
    if (contentFilter === "movies") return null; // Don't fetch TV if only movies is selected
    return {
      type: "tv" as const,
      withOriginCountry: "NG",
      sortBy: "popularity.desc",
      page: currentPage,
    };
  }, [contentFilter, currentPage]);

  // Fetch movies
  const { data: moviesData, isLoading: isLoadingMovies } = useSearch(moviesSearchParams || {});

  // Fetch TV shows
  const { data: tvData, isLoading: isLoadingTV } = useSearch(tvSearchParams || {});

  // Combine and sort results
  const allContent = useMemo(() => {
    const results: (TMDBMovie | TMDBSeries)[] = [];
    
    if (contentFilter === "all") {
      // Combine both movies and TV
      if (moviesData?.results) results.push(...moviesData.results);
      if (tvData?.results) results.push(...tvData.results);
    } else if (contentFilter === "movies" && moviesData?.results) {
      results.push(...moviesData.results);
    } else if (contentFilter === "tv" && tvData?.results) {
      results.push(...tvData.results);
    }
    
    // Sort by popularity (TMDB already returns sorted, but we'll maintain order)
    return results;
  }, [moviesData, tvData, contentFilter]);

  const isLoadingContent = isLoadingMovies || isLoadingTV;

  // Calculate total pages based on filter
  const totalPages = useMemo(() => {
    if (contentFilter === "all") {
      // For "all", we show combined results, so use the max pages
      const moviesPages = moviesData?.total_pages || 0;
      const tvPages = tvData?.total_pages || 0;
      return Math.max(moviesPages, tvPages);
    } else if (contentFilter === "movies") {
      return moviesData?.total_pages || 1;
    } else {
      return tvData?.total_pages || 1;
    }
  }, [contentFilter, moviesData, tvData]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [contentFilter]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-2 mt-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (currentPage <= 4) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = currentPage - 3 + i;
            }
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(pageNum)}
                className="cursor-pointer min-w-[40px]"
              >
                {pageNum}
              </Button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="cursor-pointer"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Nollywood</h1>

        {/* YouTube Channels Carousel - First Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">YouTube Channels</h2>
          {isLoadingChannels ? (
            <YouTubeProfileSkeleton variant="grid" count={6} />
          ) : channels.length > 0 ? (
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
          ) : (
            <p className="text-muted-foreground">No YouTube channels found.</p>
          )}
        </section>

        {/* Movies/TV Grid - Second Section */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold">Movies & TV Shows</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    {contentFilter === "all" ? "All" : contentFilter === "movies" ? "Movies" : "TV"}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem 
                    onClick={() => setContentFilter("all")} 
                    className="cursor-pointer"
                  >
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setContentFilter("movies")} 
                    className="cursor-pointer"
                  >
                    Movies
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setContentFilter("tv")} 
                    className="cursor-pointer"
                  >
                    TV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {isLoadingContent ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
              ))}
            </div>
          ) : allContent.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {allContent.map((item) => (
                  <MovieCard
                    key={item.id}
                    item={item}
                    type={"title" in item ? "movie" : "tv"}
                  />
                ))}
              </div>
              {renderPagination()}
            </>
          ) : (
            <p className="text-muted-foreground">
              No {contentFilter === "all" ? "content" : contentFilter === "movies" ? "movies" : "TV shows"} found.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
