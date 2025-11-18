"use client";

import { useState, useMemo } from "react";
import { useWatchlist, useRemoveFromWatchlist } from "@/hooks/use-watchlist";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MovieCard from "@/components/browse/movie-card";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Bookmark, Film, Tv, Trash2, Grid3x3, Table2, Search, X, ArrowUpDown, ArrowUp, ArrowDown, Filter } from "lucide-react";
import Image from "next/image";
import { getPosterUrl } from "@/lib/tmdb";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type SortField = "createdAt" | "title" | "releaseYear";
type SortOrder = "asc" | "desc";
type ViewMode = "grid" | "table";
type FilterType = "all" | "movie" | "tv";

export default function WatchlistContent() {
  const { data: watchlist = [], isLoading } = useWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();
  const router = useRouter();
  
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [itemToRemove, setItemToRemove] = useState<{ tmdbId: number; mediaType: string; title: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);

  // Convert watchlist items to TMDB format for display
  const watchlistAsTMDB = useMemo(() => {
    return watchlist.map((item) => {
      if (item.mediaType === "movie") {
        const movie: TMDBMovie = {
          id: item.tmdbId,
          title: item.title,
          overview: "",
          poster_path: item.posterPath,
          backdrop_path: item.backdropPath,
          release_date: item.releaseDate || "",
          vote_average: 0,
          vote_count: 0,
          genre_ids: [],
          popularity: 0,
          adult: false,
          original_language: "",
          original_title: item.title,
        };
        return { item: movie, type: "movie" as const, watchlistItem: item };
      } else {
        const tv: TMDBSeries = {
          id: item.tmdbId,
          name: item.title,
          overview: "",
          poster_path: item.posterPath,
          backdrop_path: item.backdropPath,
          first_air_date: item.firstAirDate || "",
          vote_average: 0,
          vote_count: 0,
          genre_ids: [],
          popularity: 0,
          original_language: "",
          original_name: item.title,
        };
        return { item: tv, type: "tv" as const, watchlistItem: item };
      }
    });
  }, [watchlist]);


  // Filter and sort
  const filteredAndSorted = useMemo(() => {
    let filtered = [...watchlistAsTMDB];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((entry) => {
        const title = "title" in entry.item ? entry.item.title : entry.item.name;
        return title?.toLowerCase().includes(query);
      });
    }

    // Type filter
    if (filterType !== "all") {
      filtered = filtered.filter((entry) => entry.type === filterType);
    }

    // Genre filter (would need genre data from TMDB - simplified for now)
    // This would require fetching genre data for each item

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number | null;
      let bValue: string | number | null;

      switch (sortField) {
        case "createdAt":
          aValue = new Date(a.watchlistItem.createdAt).getTime();
          bValue = new Date(b.watchlistItem.createdAt).getTime();
          break;
        case "title":
          aValue = ("title" in a.item ? a.item.title : a.item.name || "").toLowerCase();
          bValue = ("title" in b.item ? b.item.title : b.item.name || "").toLowerCase();
          break;
        case "releaseYear":
          aValue = a.watchlistItem.releaseDate 
            ? new Date(a.watchlistItem.releaseDate).getFullYear() 
            : a.watchlistItem.firstAirDate 
            ? new Date(a.watchlistItem.firstAirDate).getFullYear() 
            : 0;
          bValue = b.watchlistItem.releaseDate 
            ? new Date(b.watchlistItem.releaseDate).getFullYear() 
            : b.watchlistItem.firstAirDate 
            ? new Date(b.watchlistItem.firstAirDate).getFullYear() 
            : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [watchlistAsTMDB, searchQuery, filterType, sortField, sortOrder]);

  const handleRemove = async () => {
    if (!itemToRemove) return;
    try {
      await removeFromWatchlist.mutateAsync({
        tmdbId: itemToRemove.tmdbId,
        mediaType: itemToRemove.mediaType as "movie" | "tv",
      });
      toast.success("Removed from watchlist");
      setItemToRemove(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to remove from watchlist";
      toast.error(errorMessage);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterType("all");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (filterType !== "all") count++;
    return count;
  }, [searchQuery, filterType]);

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Watchlist</h1>
          <p className="text-muted-foreground">
            {filteredAndSorted.length} of {watchlist.length} {watchlist.length === 1 ? "item" : "items"}
            {activeFilterCount > 0 && (
              <span className="ml-2">
                <Badge variant="secondary" className="text-xs">
                  {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"} active
                </Badge>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="cursor-pointer"
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            Grid
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="cursor-pointer"
          >
            <Table2 className="h-4 w-4 mr-2" />
            Table
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative w-72 lg:w-80 2xl:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search watchlist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Media Type */}
        <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="movie">Movies</SelectItem>
            <SelectItem value="tv">TV Shows</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select 
          value={`${sortField}-${sortOrder}`} 
          onValueChange={(v) => {
            const [field, order] = v.split("-");
            setSortField(field as SortField);
            setSortOrder(order as SortOrder);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt-desc">Recently Added</SelectItem>
            <SelectItem value="createdAt-asc">Oldest Added</SelectItem>
            <SelectItem value="title-asc">Title (A-Z)</SelectItem>
            <SelectItem value="title-desc">Title (Z-A)</SelectItem>
            <SelectItem value="releaseYear-desc">Release Year (Newest)</SelectItem>
            <SelectItem value="releaseYear-asc">Release Year (Oldest)</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="cursor-pointer"
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {filteredAndSorted.length === 0 && watchlist.length > 0 ? (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No items match your filters</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your filters to see more results.
          </p>
          <Button variant="outline" onClick={clearFilters} className="cursor-pointer">
            Clear All Filters
          </Button>
        </div>
      ) : watchlist.length === 0 ? (
        <div className="text-center py-12">
          <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Your watchlist is empty</h3>
          <p className="text-muted-foreground">
            Start adding movies and TV shows you want to watch.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredAndSorted.map(({ item, type, watchlistItem }) => (
            <div key={watchlistItem.id} className="relative group">
              <MovieCard
                item={item}
                type={type}
                onCardClick={(clickedItem, clickedType) =>
                  setSelectedItem({
                    item: clickedItem,
                    type: clickedType,
                  })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setItemToRemove({
                    tmdbId: watchlistItem.tmdbId,
                    mediaType: watchlistItem.mediaType,
                    title: watchlistItem.title,
                  });
                }}
              >
                <Trash2 className="h-4 w-4 text-white" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th 
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      if (sortField === "title") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("title");
                        setSortOrder("asc");
                      }
                    }}
                  >
                    <div className="flex items-center">
                      Title
                      {sortField === "title" ? (sortOrder === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />) : <ArrowUpDown className="h-3 w-3 ml-1" />}
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th 
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      if (sortField === "releaseYear") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("releaseYear");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    <div className="flex items-center">
                      Year
                      {sortField === "releaseYear" ? (sortOrder === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />) : <ArrowUpDown className="h-3 w-3 ml-1" />}
                    </div>
                  </th>
                  <th 
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      if (sortField === "createdAt") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("createdAt");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    <div className="flex items-center">
                      Added
                      {sortField === "createdAt" ? (sortOrder === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />) : <ArrowUpDown className="h-3 w-3 ml-1" />}
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAndSorted.map(({ type, watchlistItem }) => {
                  const releaseYear = watchlistItem.releaseDate 
                    ? new Date(watchlistItem.releaseDate).getFullYear() 
                    : watchlistItem.firstAirDate 
                    ? new Date(watchlistItem.firstAirDate).getFullYear() 
                    : "—";
                  
                  return (
                    <tr
                      key={watchlistItem.id}
                      className="hover:bg-muted/20 transition-colors group cursor-pointer"
                      onClick={() => {
                        const titleSlug = watchlistItem.title
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-+|-+$/g, "");
                        router.push(`/browse/${type}/${titleSlug}?tmdbId=${watchlistItem.tmdbId}`);
                      }}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {watchlistItem.posterPath ? (
                            <div className="relative w-16 h-24 rounded overflow-hidden flex-shrink-0 bg-muted">
                              <Image
                                src={getPosterUrl(watchlistItem.posterPath)}
                                alt={watchlistItem.title}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-24 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                              {type === "movie" ? (
                                <Film className="h-6 w-6 text-muted-foreground" />
                              ) : (
                                <Tv className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                              {watchlistItem.title}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-muted-foreground capitalize">
                          {type}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-muted-foreground">
                          {releaseYear}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(watchlistItem.createdAt), "MMM d, yyyy")}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToRemove({
                              tmdbId: watchlistItem.tmdbId,
                              mediaType: watchlistItem.mediaType,
                              title: watchlistItem.title,
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!itemToRemove} onOpenChange={(open) => !open && setItemToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from Watchlist</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &quot;{itemToRemove?.title}&quot; from your watchlist?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemToRemove(null)} className="cursor-pointer">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removeFromWatchlist.isPending} className="cursor-pointer">
              {removeFromWatchlist.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    {selectedItem && (
      <ContentDetailModal
        item={selectedItem.item}
        type={selectedItem.type}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    )}
    </>
  );
}

