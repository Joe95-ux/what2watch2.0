"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useTopRatedMovies, useTopRatedTV } from "@/hooks/use-movies";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { GroupedPagination } from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function TopRatedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = (searchParams.get("type") || "movies") as "movies" | "tv";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const { data: moviesData, isLoading: isLoadingMovies } = useTopRatedMovies(page);
  const { data: tvData, isLoading: isLoadingTV } = useTopRatedTV(page);

  const results = type === "movies" ? (moviesData?.results || []) : (tvData?.results || []);
  const totalPages = type === "movies" ? (moviesData?.total_pages || 0) : (tvData?.total_pages || 0);
  const totalResults = type === "movies" ? (moviesData?.total_results || 0) : (tvData?.total_results || 0);
  const currentPage = type === "movies" ? (moviesData?.page || 1) : (tvData?.page || 1);
  const isLoading = type === "movies" ? isLoadingMovies : isLoadingTV;

  const updateURL = (newParams: Record<string, string | number>) => {
    const params = new URLSearchParams();
    
    // Preserve existing parameters if not being overridden
    if (type && !newParams.hasOwnProperty("type")) {
      params.set("type", type);
    }
    
    // Apply new parameters
    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, value.toString());
      }
    });
    
    router.push(`/top-rated?${params.toString()}`);
  };

  const handleTypeChange = (newType: string) => {
    updateURL({ type: newType, page: 1 });
  };

  // Determine content type for cards
  const getContentType = (item: TMDBMovie | TMDBSeries): "movie" | "tv" => {
    return "title" in item ? "movie" : "tv";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Top Rated</h1>
              {totalResults > 0 && (
                <p className="text-muted-foreground">
                  {totalResults.toLocaleString()} {totalResults === 1 ? "result" : "results"} found
                </p>
              )}
            </div>
          </div>
          
          {/* Tabs */}
          <Tabs value={type} onValueChange={handleTypeChange}>
            <TabsList>
              <TabsTrigger value="movies">Movies</TabsTrigger>
              <TabsTrigger value="tv">TV Shows</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(20)].map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-2">No results found</p>
          </div>
        ) : (
          <>
            {/* Results Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
              {results.map((item) => (
                <MoreLikeThisCard
                  key={item.id}
                  item={item}
                  type={getContentType(item)}
                />
              ))}
            </div>

            {/* Pagination */}
            <GroupedPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => updateURL({ page })}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function TopRatedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(20)].map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    }>
      <TopRatedContent />
    </Suspense>
  );
}

