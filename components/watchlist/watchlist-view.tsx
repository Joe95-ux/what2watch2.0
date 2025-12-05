"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MovieCard from "@/components/browse/movie-card";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Bookmark, Film, Tv, Trash2, Grid3x3, Table2, List, Search, X, ArrowUpDown, ArrowUp, ArrowDown, Filter, Share2, Edit2, MoreVertical, Download, Plus, Eye, Lock, Check } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import CreateListModal from "@/components/lists/create-list-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { WatchlistItem } from "@/hooks/use-watchlist";

type SortField = "createdAt" | "title" | "releaseYear";
type SortOrder = "asc" | "desc";
type ViewMode = "grid" | "table" | "detailed";
type FilterType = "all" | "movie" | "tv";

interface WatchlistViewProps {
  // Data
  watchlist: WatchlistItem[];
  isLoading: boolean;
  user?: {
    id: string;
    username?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
  
  // Permissions
  isOwner: boolean;
  
  // Owner-only features
  enableRemove?: boolean;
  enableEdit?: boolean;
  enableExport?: boolean;
  enableCreateList?: boolean;
  enablePublicToggle?: boolean;
  isPublic?: boolean;
  onTogglePublic?: (checked: boolean) => Promise<void>;
  onRemove?: (tmdbId: number, mediaType: "movie" | "tv") => Promise<void>;
  
  // Share (available to everyone)
  shareUrl: string;
  onShare?: () => void;
  
  // Empty state
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  
  // Error state
  errorTitle?: string;
  errorDescription?: string;
  errorAction?: React.ReactNode;
}

export default function WatchlistView({
  watchlist,
  isLoading,
  user,
  isOwner,
  enableRemove = false,
  enableEdit = false,
  enableExport = false,
  enableCreateList = false,
  enablePublicToggle = false,
  isPublic: isPublicProp,
  onTogglePublic,
  onRemove,
  shareUrl,
  onShare,
  emptyTitle = "This watchlist is empty",
  emptyDescription = "No items have been added yet.",
  emptyAction,
  errorTitle = "Watchlist not found",
  errorDescription = "This watchlist doesn't exist or is private.",
  errorAction,
}: WatchlistViewProps) {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [itemToRemove, setItemToRemove] = useState<{ tmdbId: number; mediaType: string; title: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Convert watchlist items to TMDB format for display
  const watchlistAsTMDB = useMemo(() => {
    return watchlist.map((item: WatchlistItem) => {
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

      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortOrder === "asc" ? 1 : -1;
      if (bValue === null) return sortOrder === "asc" ? -1 : 1;
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [watchlistAsTMDB, searchQuery, filterType, sortField, sortOrder]);

  const handleRemove = async () => {
    if (!itemToRemove || !onRemove) return;
    try {
      await onRemove(itemToRemove.tmdbId, itemToRemove.mediaType as "movie" | "tv");
      toast.success("Removed from watchlist");
      setItemToRemove(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to remove from watchlist";
      toast.error(errorMessage);
    }
  };

  const handleBulkRemove = async () => {
    if (selectedItems.size === 0 || !onRemove) return;
    try {
      const itemsToRemove = filteredAndSorted.filter(({ watchlistItem }) => 
        selectedItems.has(watchlistItem.id)
      );
      
      for (const { watchlistItem } of itemsToRemove) {
        await onRemove(watchlistItem.tmdbId, watchlistItem.mediaType as "movie" | "tv");
      }
      
      toast.success(`Removed ${selectedItems.size} item${selectedItems.size > 1 ? "s" : ""} from watchlist`);
      setSelectedItems(new Set());
      setIsEditMode(false);
    } catch (error) {
      toast.error("Failed to remove items");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Title", "Type", "Release Year", "Added Date"];
    const rows = filteredAndSorted.map(({ watchlistItem, type }) => {
      const releaseYear = watchlistItem.releaseDate 
        ? new Date(watchlistItem.releaseDate).getFullYear() 
        : watchlistItem.firstAirDate 
        ? new Date(watchlistItem.firstAirDate).getFullYear() 
        : "";
      const addedDate = format(new Date(watchlistItem.createdAt), "yyyy-MM-dd");
      return [
        watchlistItem.title,
        type === "movie" ? "Movie" : "TV Show",
        releaseYear.toString(),
        addedDate,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `watchlist-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Watchlist exported to CSV");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
      if (onShare) onShare();
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleTogglePublic = async (checked: boolean) => {
    if (!onTogglePublic) return;
    try {
      await onTogglePublic(checked);
      toast.success(checked ? "Watchlist is now public" : "Watchlist is now private");
    } catch (error) {
      toast.error("Failed to update watchlist visibility");
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredAndSorted.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSorted.map(({ watchlistItem }) => watchlistItem.id)));
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

  // Get banner image from first item
  const bannerImage = filteredAndSorted.length > 0 && filteredAndSorted[0].watchlistItem.backdropPath
    ? getPosterUrl(filteredAndSorted[0].watchlistItem.backdropPath, "original")
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative -mt-[65px] h-[30vh] min-h-[200px] max-h-[300px] sm:h-[40vh] sm:min-h-[250px] md:h-[50vh] md:min-h-[300px] overflow-hidden bg-muted" />
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!watchlist || watchlist.length === 0 && !isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">{errorTitle}</h2>
            <p className="text-muted-foreground mb-4">{errorDescription}</p>
            {errorAction}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Banner Section */}
        <div className="relative -mt-[65px] h-[30vh] min-h-[200px] max-h-[300px] sm:h-[40vh] sm:min-h-[250px] md:h-[50vh] md:min-h-[300px] overflow-hidden">
          {bannerImage ? (
            <>
              <Image
                src={bannerImage}
                alt="Watchlist"
                fill
                className="object-cover"
                sizes="100vw"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-pink-500/30" />
          )}
        </div>

        {/* Info Section */}
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex-1">
              {user && !isOwner ? (
                <div className="flex items-center gap-3 mb-4">
                  <Link href={`/users/${user.id}`}>
                    <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 ring-primary transition-all">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || user.username || "User"} />
                      <AvatarFallback>
                        {(user.displayName || user.username || "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <Link 
                      href={`/users/${user.id}`}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      {user.displayName || user.username || "Unknown"}
                    </Link>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Watchlist</h1>
                  </div>
                </div>
              ) : (
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Watchlist</h1>
              )}
              <p className="text-base sm:text-lg text-muted-foreground mb-4 max-w-2xl">
                {user && !isOwner 
                  ? `A collection of movies and TV shows ${user.displayName || user.username || "this user"} wants to watch.`
                  : "Your personal collection of movies and TV shows you want to watch. Save titles as you discover them, organize your viewing queue, and never lose track of what to watch next."
                }
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {filteredAndSorted.length} of {watchlist.length} {watchlist.length === 1 ? "item" : "items"}
                </span>
                {isPublicProp !== undefined && (
                  <>
                    <span>•</span>
                    <span className={isPublicProp ? "text-primary" : "text-muted-foreground"}>
                      {isPublicProp ? "Public" : "Private"}
                    </span>
                  </>
                )}
                {activeFilterCount > 0 && (
                  <>
                    <span>•</span>
                    <Badge variant="secondary" className="text-xs">
                      {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"} active
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 ml-auto sm:ml-0">
              {enableCreateList && (
                <Button
                  variant="outline"
                  onClick={() => setIsCreateListModalOpen(true)}
                  className="gap-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Create List
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsShareDialogOpen(true)}
                className="gap-2 cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              {enablePublicToggle && onTogglePublic && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/50" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    id="public-toggle"
                    checked={isPublicProp ?? false}
                    onCheckedChange={handleTogglePublic}
                  />
                  <Label htmlFor="public-toggle" className="text-sm cursor-pointer flex items-center gap-1.5">
                    {isPublicProp ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    {isPublicProp ? "Public" : "Private"}
                  </Label>
                </div>
              )}
              {(enableEdit || enableExport) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="cursor-pointer">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {enableEdit && (
                      <DropdownMenuItem onClick={() => setIsEditMode(!isEditMode)} className="cursor-pointer">
                        <Edit2 className="h-4 w-4 mr-2" />
                        {isEditMode ? "Exit Edit Mode" : "Edit"}
                      </DropdownMenuItem>
                    )}
                    {enableExport && (
                      <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {isEditMode && enableRemove && (
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="cursor-pointer"
                >
                  {selectedItems.size === filteredAndSorted.length ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Select All
                    </>
                  )}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedItems.size} of {filteredAndSorted.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkRemove}
                  disabled={selectedItems.size === 0}
                  className="cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Selected
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* View Mode Toggle and Filters */}
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
              <Button
                variant={viewMode === "detailed" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("detailed")}
                className="cursor-pointer"
              >
                <List className="h-4 w-4 mr-2" />
                Detailed
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-72 lg:w-80 2xl:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search watchlist..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

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
          </div>

          {/* Content Views */}
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
              <h3 className="text-lg font-semibold mb-2">{emptyTitle}</h3>
              <p className="text-muted-foreground mb-4">
                {emptyDescription}
              </p>
              {emptyAction}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredAndSorted.map(({ item, type, watchlistItem }) => (
                <div key={watchlistItem.id} className="relative">
                  {isEditMode && enableEdit && (
                    <div className="absolute top-2 left-2 z-10">
                      <Button
                        variant={selectedItems.has(watchlistItem.id) ? "default" : "outline"}
                        size="icon"
                        className={cn(
                          "h-8 w-8 cursor-pointer",
                          selectedItems.has(watchlistItem.id) && "bg-primary"
                        )}
                        onClick={() => toggleItemSelection(watchlistItem.id)}
                      >
                        {selectedItems.has(watchlistItem.id) ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <div className="h-4 w-4 border-2 border-current rounded" />
                        )}
                      </Button>
                    </div>
                  )}
                  <MovieCard
                    item={item}
                    type={type}
                    onCardClick={(clickedItem, clickedType) =>
                      setSelectedItem({
                        item: clickedItem,
                        type: clickedType,
                      })
                    }
                    onRemove={enableRemove ? () => {
                      setItemToRemove({
                        tmdbId: watchlistItem.tmdbId,
                        mediaType: watchlistItem.mediaType,
                        title: watchlistItem.title,
                      });
                    } : undefined}
                  />
                </div>
              ))}
            </div>
          ) : viewMode === "table" ? (
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      {isEditMode && enableEdit && (
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 cursor-pointer"
                            onClick={toggleSelectAll}
                          >
                            {selectedItems.size === filteredAndSorted.length ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <div className="h-4 w-4 border-2 border-current rounded" />
                            )}
                          </Button>
                        </th>
                      )}
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
                      {!isEditMode && enableRemove && (
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      )}
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
                          className={cn(
                            "hover:bg-muted/20 transition-colors group cursor-pointer",
                            isEditMode && selectedItems.has(watchlistItem.id) && "bg-primary/10"
                          )}
                          onClick={() => {
                            if (isEditMode) {
                              toggleItemSelection(watchlistItem.id);
                            } else {
                              router.push(`/${type}/${watchlistItem.tmdbId}`);
                            }
                          }}
                        >
                          {isEditMode && enableEdit && (
                            <td className="px-4 py-4">
                              <Button
                                variant={selectedItems.has(watchlistItem.id) ? "default" : "outline"}
                                size="icon"
                                className={cn(
                                  "h-6 w-6 cursor-pointer",
                                  selectedItems.has(watchlistItem.id) && "bg-primary"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleItemSelection(watchlistItem.id);
                                }}
                              >
                                {selectedItems.has(watchlistItem.id) ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <div className="h-3 w-3 border-2 border-current rounded" />
                                )}
                              </Button>
                            </td>
                          )}
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
                          {!isEditMode && enableRemove && (
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
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            // Detailed View (IMDb-style)
            <div className="space-y-4">
              {filteredAndSorted.map(({ item, type, watchlistItem }) => {
                const releaseYear = watchlistItem.releaseDate 
                  ? new Date(watchlistItem.releaseDate).getFullYear() 
                  : watchlistItem.firstAirDate 
                  ? new Date(watchlistItem.firstAirDate).getFullYear() 
                  : null;
                
                return (
                  <div
                    key={watchlistItem.id}
                    className={cn(
                      "flex gap-4 p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors group cursor-pointer",
                      isEditMode && selectedItems.has(watchlistItem.id) && "bg-primary/10 border-primary"
                    )}
                    onClick={() => {
                      if (isEditMode) {
                        toggleItemSelection(watchlistItem.id);
                      } else {
                        setSelectedItem({ item, type });
                      }
                    }}
                  >
                    {isEditMode && enableEdit && (
                      <div className="flex-shrink-0">
                        <Button
                          variant={selectedItems.has(watchlistItem.id) ? "default" : "outline"}
                          size="icon"
                          className={cn(
                            "h-6 w-6 cursor-pointer",
                            selectedItems.has(watchlistItem.id) && "bg-primary"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleItemSelection(watchlistItem.id);
                          }}
                        >
                          {selectedItems.has(watchlistItem.id) ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <div className="h-3 w-3 border-2 border-current rounded" />
                          )}
                        </Button>
                      </div>
                    )}
                    {watchlistItem.posterPath ? (
                      <div className="relative w-20 h-28 sm:w-24 sm:h-36 rounded overflow-hidden flex-shrink-0 bg-muted">
                        <Image
                          src={getPosterUrl(watchlistItem.posterPath)}
                          alt={watchlistItem.title}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-28 sm:w-24 sm:h-36 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                        {type === "movie" ? (
                          <Film className="h-8 w-8 text-muted-foreground" />
                        ) : (
                          <Tv className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors mb-1">
                            {watchlistItem.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {releaseYear && <span>{releaseYear}</span>}
                            {releaseYear && <span>•</span>}
                            <span className="capitalize">{type}</span>
                            <span>•</span>
                            <span>Added {format(new Date(watchlistItem.createdAt), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                        {!isEditMode && enableRemove && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive flex-shrink-0"
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
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Watchlist</DialogTitle>
            <DialogDescription>
              Share this watchlist with others using the link below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="shrink-0 cursor-pointer"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {isPublicProp === false && (
              <div className="p-4 rounded-lg border bg-muted/50 text-center">
                <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Make your watchlist public to generate a shareable link
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      {enableRemove && (
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
              <Button variant="destructive" onClick={handleRemove} className="cursor-pointer">
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create List Modal */}
      {enableCreateList && (
        <CreateListModal
          isOpen={isCreateListModalOpen}
          onClose={() => setIsCreateListModalOpen(false)}
        />
      )}

      {/* Content Detail Modal */}
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

