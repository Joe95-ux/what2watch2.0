"use client";

import { useState, useEffect, useMemo } from "react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MovieCard from "@/components/browse/movie-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Youtube } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Image from "next/image";
import { NOLLYWOOD_CHANNEL_IDS } from "@/lib/youtube-channels";

const ITEMS_PER_PAGE = 20;

export default function NollywoodPage() {
  const [channels, setChannels] = useState<Array<{
    id: string;
    title: string;
    thumbnail: string;
    channelUrl: string;
  }>>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [tvShows, setTVShows] = useState<TMDBSeries[]>([]);
  const [isLoadingMovies, setIsLoadingMovies] = useState(true);
  const [isLoadingTV, setIsLoadingTV] = useState(true);
  
  const [moviesPage, setMoviesPage] = useState(1);
  const [tvPage, setTVPage] = useState(1);

  // Fetch channels
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setIsLoadingChannels(true);
        
        if (NOLLYWOOD_CHANNEL_IDS.length > 0) {
          const channelIds = NOLLYWOOD_CHANNEL_IDS.join(",");
          const response = await fetch(`/api/youtube/channels?channelIds=${encodeURIComponent(channelIds)}`);
          if (response.ok) {
            const data = await response.json();
            setChannels(data.channels || []);
          }
        }
      } catch (error) {
        console.error("Error fetching YouTube channels:", error);
      } finally {
        setIsLoadingChannels(false);
      }
    };

    fetchChannels();
  }, []);

  // Fetch all movies
  useEffect(() => {
    const fetchAllMovies = async () => {
      setIsLoadingMovies(true);
      const allResults: TMDBMovie[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 10) {
        try {
          const searchParams = new URLSearchParams();
          searchParams.set("type", "movie");
          searchParams.set("withOriginCountry", "NG");
          searchParams.set("sortBy", "popularity.desc");
          searchParams.set("page", page.toString());

          const response = await fetch(`/api/search?${searchParams.toString()}`);
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              const movieResults = data.results.filter((item: TMDBMovie | TMDBSeries) => "title" in item) as TMDBMovie[];
              allResults.push(...movieResults);
              if (data.results.length < 20 || page >= data.total_pages) {
                hasMore = false;
              } else {
                page++;
              }
            } else {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        } catch (error) {
          console.error(`Error fetching movies page ${page}:`, error);
          hasMore = false;
        }
      }

      setMovies(allResults);
      setIsLoadingMovies(false);
    };

    fetchAllMovies();
  }, []);

  // Fetch all TV shows
  useEffect(() => {
    const fetchAllTV = async () => {
      setIsLoadingTV(true);
      const allResults: TMDBSeries[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 10) {
        try {
          const searchParams = new URLSearchParams();
          searchParams.set("type", "tv");
          searchParams.set("withOriginCountry", "NG");
          searchParams.set("sortBy", "popularity.desc");
          searchParams.set("page", page.toString());

          const response = await fetch(`/api/search?${searchParams.toString()}`);
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              const tvResults = data.results.filter((item: TMDBMovie | TMDBSeries) => "name" in item) as TMDBSeries[];
              allResults.push(...tvResults);
              if (data.results.length < 20 || page >= data.total_pages) {
                hasMore = false;
              } else {
                page++;
              }
            } else {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        } catch (error) {
          console.error(`Error fetching TV page ${page}:`, error);
          hasMore = false;
        }
      }

      setTVShows(allResults);
      setIsLoadingTV(false);
    };

    fetchAllTV();
  }, []);

  // Client-side pagination for movies
  const moviesTotalPages = Math.ceil(movies.length / ITEMS_PER_PAGE);
  const paginatedMovies = useMemo(() => {
    return movies.slice((moviesPage - 1) * ITEMS_PER_PAGE, moviesPage * ITEMS_PER_PAGE);
  }, [movies, moviesPage]);

  // Client-side pagination for TV shows
  const tvTotalPages = Math.ceil(tvShows.length / ITEMS_PER_PAGE);
  const paginatedTV = useMemo(() => {
    return tvShows.slice((tvPage - 1) * ITEMS_PER_PAGE, tvPage * ITEMS_PER_PAGE);
  }, [tvShows, tvPage]);

  const handleMoviesPageChange = (newPage: number) => {
    setMoviesPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTVPageChange = (newPage: number) => {
    setTVPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderPagination = (
    currentPage: number,
    totalPages: number,
    onPageChange: (page: number) => void
  ) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-2 mt-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
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
                onClick={() => onPageChange(pageNum)}
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
          onClick={() => onPageChange(currentPage + 1)}
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

        {/* YouTube Channels Carousel */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">YouTube Channels</h2>
          {isLoadingChannels ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : channels.length > 0 ? (
            <div className="relative group/carousel">
              <Carousel
                opts={{
                  align: "start",
                  slidesToScroll: 4,
                  breakpoints: {
                    "(max-width: 640px)": { slidesToScroll: 2 },
                    "(max-width: 1024px)": { slidesToScroll: 3 },
                    "(max-width: 1280px)": { slidesToScroll: 4 },
                  },
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4 gap-4">
                  {channels.map((channel) => (
                    <CarouselItem key={channel.id} className="pl-2 md:pl-4 basis-[140px] sm:basis-[160px]">
                      <a
                        href={channel.channelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block text-center cursor-pointer"
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
                      </a>
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

        {/* Movies Grid */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Movies</h2>
          
          {isLoadingMovies ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
              ))}
            </div>
          ) : paginatedMovies.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {paginatedMovies.map((item) => (
                  <MovieCard
                    key={item.id}
                    item={item}
                    type="movie"
                  />
                ))}
              </div>
              {renderPagination(moviesPage, moviesTotalPages, handleMoviesPageChange)}
            </>
          ) : (
            <p className="text-muted-foreground">No movies found.</p>
          )}
        </section>

        {/* TV Shows Grid */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">TV Shows</h2>
          
          {isLoadingTV ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
              ))}
            </div>
          ) : paginatedTV.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {paginatedTV.map((item) => (
                  <MovieCard
                    key={item.id}
                    item={item}
                    type="tv"
                  />
                ))}
              </div>
              {renderPagination(tvPage, tvTotalPages, handleTVPageChange)}
            </>
          ) : (
            <p className="text-muted-foreground">No TV shows found.</p>
          )}
        </section>
      </div>
    </div>
  );
}
