"use client";

import { useState, useMemo } from "react";
import { usePublicLists } from "@/components/lists/public-lists-content";
import { usePublicPlaylists } from "@/hooks/use-playlists";
import ListCard from "@/components/browse/list-card";
import PlaylistCard from "@/components/browse/playlist-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { List } from "@/hooks/use-lists";
import { Playlist } from "@/hooks/use-playlists";

const ITEMS_PER_PAGE = 12; // 3 per row × 4 rows

type SortOption = "popularity" | "newest" | "oldest" | "name";
type FilterType = "all" | "editorial" | "lists" | "playlists";

function buildVisiblePageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, totalPages - 1, totalPages];
  if (currentPage >= totalPages - 3) {
    return [1, 2, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
}

export function WatchGuideTab() {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("popularity");
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Fetch all public lists and playlists
  const { data: publicLists = [], isLoading: isLoadingLists } = usePublicLists(100);
  const { data: publicPlaylists = [], isLoading: isLoadingPlaylists } = usePublicPlaylists(100);

  const isLoading = isLoadingLists || isLoadingPlaylists;

  // Combine and filter items
  const allItems = useMemo(() => {
    const items: Array<{ type: "list" | "playlist"; data: List | Playlist }> = [];
    const editorialLists = publicLists.filter((list) => list.isEditorial);
    const nonEditorialLists = publicLists.filter((list) => !list.isEditorial);

    if (filterType === "all" || filterType === "editorial") {
      editorialLists.forEach((list) => {
        items.push({ type: "list", data: list });
      });
    }

    if (filterType === "all" || filterType === "lists") {
      nonEditorialLists.forEach((list) => {
        items.push({ type: "list", data: list });
      });
    }

    if (filterType === "all" || filterType === "playlists") {
      publicPlaylists.forEach((playlist) => {
        items.push({ type: "playlist", data: playlist });
      });
    }

    // Sort items (editorial lists stay prioritized in "all")
    items.sort((a, b) => {
      if (filterType === "all") {
        const aIsEditorialList = a.type === "list" && Boolean((a.data as List).isEditorial);
        const bIsEditorialList = b.type === "list" && Boolean((b.data as List).isEditorial);
        if (aIsEditorialList !== bIsEditorialList) return aIsEditorialList ? -1 : 1;
      }
      switch (sortBy) {
        case "popularity":
          // Sort by likes/follows count (if available)
          const aLikes = (a.data as List & { _count?: { likedBy?: number } })._count?.likedBy || 0;
          const bLikes = (b.data as List & { _count?: { likedBy?: number } })._count?.likedBy || 0;
          const aPlaylistLikes = (a.data as Playlist & { likesCount?: number }).likesCount || 0;
          const bPlaylistLikes = (b.data as Playlist & { likesCount?: number }).likesCount || 0;
          const aPopularity = a.type === "list" ? aLikes : aPlaylistLikes;
          const bPopularity = b.type === "list" ? bLikes : bPlaylistLikes;
          return bPopularity - aPopularity;
        case "newest":
          const aDate = new Date(a.data.createdAt || 0).getTime();
          const bDate = new Date(b.data.createdAt || 0).getTime();
          return bDate - aDate;
        case "oldest":
          const aDateOld = new Date(a.data.createdAt || 0).getTime();
          const bDateOld = new Date(b.data.createdAt || 0).getTime();
          return aDateOld - bDateOld;
        case "name":
          const aName = a.data.name.toLowerCase();
          const bName = b.data.name.toLowerCase();
          return aName.localeCompare(bName);
        default:
          return 0;
      }
    });

    return items;
  }, [publicLists, publicPlaylists, sortBy, filterType]);

  const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = allItems.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: FilterType) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-full max-h-[225px] h-[225px] rounded-lg" />
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No lists or playlists available.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <Select value={filterType} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-[140px] cursor-pointer">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem className="cursor-pointer" value="all">All</SelectItem>
            <SelectItem className="cursor-pointer" value="editorial">Editorial Lists</SelectItem>
            <SelectItem className="cursor-pointer" value="lists">Lists</SelectItem>
            <SelectItem className="cursor-pointer" value="playlists">Playlists</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[140px] cursor-pointer">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem className="cursor-pointer" value="popularity">Popularity</SelectItem>
            <SelectItem className="cursor-pointer" value="newest">Newest</SelectItem>
            <SelectItem className="cursor-pointer" value="oldest">Oldest</SelectItem>
            <SelectItem className="cursor-pointer" value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedItems.map(({ type, data }) =>
          type === "list" ? (
            <ListCard key={`list-${data.id}`} list={data as List} variant="grid" />
          ) : (
            <PlaylistCard key={`playlist-${data.id}`} playlist={data as Playlist} variant="grid" />
          )
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {buildVisiblePageNumbers(currentPage, totalPages).map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(page)}
              className="cursor-pointer min-w-9"
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

