"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { TMDBMovie, TMDBSeries, type TMDBResponse } from "@/lib/tmdb";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupedPagination } from "@/components/ui/pagination";
import { BrowseMediaTabSwitcher } from "@/components/browse/browse-media-tab-switcher";

const ITEMS_PER_PAGE = 24;
const TMDB_ITEMS_PER_PAGE = 20;

function TopRatedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = (searchParams.get("type") || "movies") as "movies" | "tv";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const apiPage = Math.ceil(((page - 1) * ITEMS_PER_PAGE + 1) / TMDB_ITEMS_PER_PAGE);
  const startIndex = ((page - 1) * ITEMS_PER_PAGE) % TMDB_ITEMS_PER_PAGE;

  const { data, isLoading } = useQuery<TMDBResponse<TMDBMovie | TMDBSeries>>({
    queryKey: ["top-rated-page", type, page],
    queryFn: async () => {
      const base = type === "movies" ? "/api/movies/top-rated" : "/api/tv/top-rated";
      const [primaryRes, secondaryRes] = await Promise.all([
        fetch(`${base}?page=${apiPage}`),
        fetch(`${base}?page=${apiPage + 1}`),
      ]);

      if (!primaryRes.ok) throw new Error("Failed to fetch top rated titles");
      if (!secondaryRes.ok) throw new Error("Failed to fetch additional top rated titles");

      const primaryData = (await primaryRes.json()) as TMDBResponse<TMDBMovie | TMDBSeries>;
      const secondaryData = (await secondaryRes.json()) as TMDBResponse<TMDBMovie | TMDBSeries>;
      const combinedResults = [...(primaryData.results || []), ...(secondaryData.results || [])];

      return {
        ...primaryData,
        page,
        results: combinedResults.slice(startIndex, startIndex + ITEMS_PER_PAGE),
        total_pages: Math.ceil((primaryData.total_results || 0) / ITEMS_PER_PAGE),
      };
    },
    staleTime: 1000 * 60 * 60 * 2,
  });

  const results = data?.results || [];
  const totalPages = data?.total_pages || 0;
  const totalResults = data?.total_results || 0;
  const currentPage = data?.page || page;

  const updateURL = (newParams: Record<string, string | number>) => {
    const params = new URLSearchParams();

    if (type && !Object.prototype.hasOwnProperty.call(newParams, "type")) {
      params.set("type", type);
    }

    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, value.toString());
      }
    });

    router.push(`/top-rated?${params.toString()}`);
  };

  const handleTypeChange = (newType: "movies" | "tv") => {
    updateURL({ type: newType, page: 1 });
  };

  const getContentType = (item: TMDBMovie | TMDBSeries): "movie" | "tv" => {
    return "title" in item ? "movie" : "tv";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold mb-2">Top Rated</h1>
            {totalResults > 0 && (
              <p className="text-muted-foreground">
                {totalResults.toLocaleString()} {totalResults === 1 ? "result" : "results"} found
              </p>
            )}
          </div>
          <BrowseMediaTabSwitcher
            value={type}
            onChange={handleTypeChange}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-2">No results found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
              {results.map((item) => (
                <MoreLikeThisCard
                  key={item.id}
                  item={item}
                  type={getContentType(item)}
                />
              ))}
            </div>

            <GroupedPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(nextPage) => updateURL({ page: nextPage })}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function TopRatedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Skeleton className="h-10 w-64 mb-8" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[...Array(24)].map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <TopRatedContent />
    </Suspense>
  );
}
