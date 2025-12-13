"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLikedContent } from "@/hooks/use-liked-content";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { MoreLikeThisCardSkeleton } from "@/components/skeletons/more-like-this-card-skeleton";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { ThumbsUp, Film, Tv } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { SimplePagination as Pagination } from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 24;

type FilterType = "all" | "movie" | "tv";

// Fetch TMDB details for a content item
async function fetchTMDBDetails(tmdbId: number, mediaType: "movie" | "tv") {
  try {
    const response = await fetch(`/api/tmdb/${mediaType}/${tmdbId}`);
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error(`Error fetching ${mediaType} details for ${tmdbId}:`, error);
    return null;
  }
}

export default function MyListsLikedTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: likedContent = [], isLoading: isLoadingLiked } = useLikedContent();
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<FilterType>(() => {
    const filter = searchParams.get("filter");
    return (filter === "movie" || filter === "tv") ? filter : "all";
  });

  // Update URL when filter changes
  useEffect(() => {
    const currentFilter = searchParams.get("filter");
    const expectedFilter = filterType === "all" ? null : filterType;
    
    if (currentFilter !== expectedFilter) {
      const params = new URLSearchParams(searchParams.toString());
      if (filterType === "all") {
        params.delete("filter");
      } else {
        params.set("filter", filterType);
      }
      const newUrl = params.toString() ? `/lists?${params.toString()}` : "/lists";
      router.push(newUrl);
    }
  }, [filterType, router, searchParams]);

  // Sync with URL changes (browser back/forward)
  useEffect(() => {
    const filter = searchParams.get("filter");
    if (filter === "movie" || filter === "tv") {
      setFilterType(filter);
    } else {
      setFilterType("all");
    }
  }, [searchParams]);

  // Filter by type
  const filteredLikedContent = useMemo(() => {
    if (filterType === "all") return likedContent;
    return likedContent.filter((item) => item.mediaType === filterType);
  }, [likedContent, filterType]);

  // Fetch TMDB details for all liked content
  const { data: contentDetails = [], isLoading: isLoadingDetails } = useQuery({
    queryKey: ["liked-content-details", filteredLikedContent],
    queryFn: async () => {
      const details = await Promise.all(
        filteredLikedContent.map((item) =>
          fetchTMDBDetails(item.tmdbId, item.mediaType)
        )
      );
      return details.filter((detail) => detail !== null);
    },
    enabled: filteredLikedContent.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Convert to items with type
  const items = useMemo(() => {
    return contentDetails
      .map((detail: any, index: number) => {
        const likedItem = filteredLikedContent[index];
        if (!likedItem || !detail) return null;
        
        return {
          item: detail as TMDBMovie | TMDBSeries,
          type: likedItem.mediaType as "movie" | "tv",
        };
      })
      .filter((item): item is { item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } => item !== null);
  }, [contentDetails, filteredLikedContent]);

  // Pagination
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage]);

  const isLoading = isLoadingLiked || isLoadingDetails;

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="border-b border-border max-w-fit">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
          {[
            { id: "all" as FilterType, label: "All", icon: null },
            { id: "movie" as FilterType, label: "Movies", icon: Film },
            { id: "tv" as FilterType, label: "TV", icon: Tv },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setFilterType(tab.id);
                  setCurrentPage(1);
                }}
                className={cn(
                  "relative py-3 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2",
                  filterType === tab.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {tab.label}
                {filterType === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <MoreLikeThisCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <ThumbsUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No liked content yet</h3>
          <p className="text-muted-foreground">
            Like films and TV shows to see them here
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {paginatedItems.map(({ item, type }) => (
              <MoreLikeThisCard
                key={`${item.id}-${type}`}
                item={item}
                type={type}
                showTypeBadge
              />
            ))}
          </div>
          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}
