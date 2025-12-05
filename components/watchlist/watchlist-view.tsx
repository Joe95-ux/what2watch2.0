"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MovieCard from "@/components/browse/movie-card";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Bookmark, Film, Tv, Trash2, Grid3x3, Table2, List, Search, X, ArrowUpDown, ArrowUp, ArrowDown, Filter, Share2, Edit2, MoreVertical, Download, Plus, Eye, Lock, Check, Copy, Move, Star, Facebook, Twitter, MessageCircle, Mail, Link2 } from "lucide-react";
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
import { useMovieDetails, useTVDetails, useIMDBRating } from "@/hooks/use-content-details";
import { useIsWatched, useQuickWatch, useUnwatch } from "@/hooks/use-viewing-logs";
import { useUser } from "@clerk/nextjs";
import { IMDBBadge } from "@/components/ui/imdb-badge";
import { useLists, useUpdateList, useCreateList } from "@/hooks/use-lists";
import { useReorderWatchlist } from "@/hooks/use-watchlist";

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
  
  // In edit mode, force detailed view
  const effectiveViewMode = isEditMode ? "detailed" : viewMode;
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [itemToRemove, setItemToRemove] = useState<{ tmdbId: number; mediaType: string; title: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const { isSignedIn } = useUser();
  const reorderWatchlist = useReorderWatchlist();
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

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
    
    // In edit mode, sort by order first (items with order > 0), then by createdAt
    if (isEditMode) {
      filtered.sort((a, b) => {
        const aOrder = a.watchlistItem.order || 0;
        const bOrder = b.watchlistItem.order || 0;
        
        // Items with order come first
        if (aOrder > 0 && bOrder === 0) return -1;
        if (aOrder === 0 && bOrder > 0) return 1;
        
        // If both have order, sort by order
        if (aOrder > 0 && bOrder > 0) {
          return aOrder - bOrder;
        }
        
        // If neither has order, sort by createdAt
        return new Date(b.watchlistItem.createdAt).getTime() - new Date(a.watchlistItem.createdAt).getTime();
      });
    }

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

  const handleSocialShare = (platform: "facebook" | "twitter" | "whatsapp" | "email" | "link") => {
    if (!shareUrl) {
      toast.error("Watchlist is not public. Make it public to share.");
      return;
    }

    const encodedUrl = encodeURIComponent(shareUrl);
    const userName = user?.displayName || user?.username || "User";
    const encodedTitle = encodeURIComponent(`${userName}'s Watchlist`);
    const encodedDescription = encodeURIComponent(`Check out ${userName}'s watchlist on What2Watch`);

    if (platform === "link") {
      handleCopyLink();
      return;
    }

    let shareUrl_platform = "";
    if (platform === "facebook") {
      shareUrl_platform = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    } else if (platform === "twitter") {
      shareUrl_platform = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}${encodedDescription ? ` - ${encodedDescription}` : ""}`;
    } else if (platform === "whatsapp") {
      shareUrl_platform = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
    } else if (platform === "email") {
      const subject = encodeURIComponent(`${userName}'s Watchlist`);
      const body = encodeURIComponent(`Check out ${userName}'s watchlist:\n\n${shareUrl}`);
      shareUrl_platform = `mailto:?subject=${subject}&body=${body}`;
    }

    if (shareUrl_platform) {
      if (platform === "email") {
        window.location.href = shareUrl_platform;
      } else {
        window.open(shareUrl_platform, "_blank", "width=600,height=400");
      }
      if (onShare) {
        onShare();
      }
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
            <div className="flex items-center justify-end gap-2 ml-auto sm:ml-0 overflow-x-auto">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 cursor-pointer">
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => handleSocialShare("facebook")}
                    className="cursor-pointer"
                  >
                    <Facebook className="h-4 w-4 mr-2" />
                    Facebook
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSocialShare("twitter")}
                    className="cursor-pointer"
                  >
                    <Twitter className="h-4 w-4 mr-2" />
                    X (Twitter)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSocialShare("whatsapp")}
                    className="cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSocialShare("email")}
                    className="cursor-pointer"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSocialShare("link")}
                    className="cursor-pointer"
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {enablePublicToggle && onTogglePublic && (
                <div 
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md border",
                    isPublicProp 
                      ? "bg-blue-500/20 border-blue-500/30 text-blue-700 dark:text-blue-400" 
                      : "bg-orange-500/20 border-orange-500/30 text-orange-700 dark:text-orange-400"
                  )} 
                  onClick={(e) => e.stopPropagation()}
                >
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
              <div className="flex items-center gap-2 overflow-x-auto">
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
          {/* View Mode Toggle and Filters / Edit Mode Actions */}
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {isEditMode && enableEdit ? (
              <div className="flex items-center gap-2 overflow-x-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCopyModalOpen(true)}
                  disabled={selectedItems.size === 0}
                  className="cursor-pointer"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy ({selectedItems.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMoveModalOpen(true)}
                  disabled={selectedItems.size === 0}
                  className="cursor-pointer"
                >
                  <Move className="h-4 w-4 mr-2" />
                  Move ({selectedItems.size})
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkRemove}
                  disabled={selectedItems.size === 0}
                  className="cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedItems.size})
                </Button>
              </div>
            ) : (
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
            )}

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
          ) : effectiveViewMode === "grid" ? (
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
          ) : effectiveViewMode === "table" ? (
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
              {filteredAndSorted.map(({ item, type, watchlistItem }, index) => (
                <DetailedWatchlistItem
                  key={watchlistItem.id}
                  item={item}
                  type={type}
                  watchlistItem={watchlistItem}
                  isEditMode={isEditMode && enableEdit}
                  isSelected={selectedItems.has(watchlistItem.id)}
                  order={isEditMode ? (watchlistItem.order > 0 ? watchlistItem.order : index + 1) : undefined}
                  index={index}
                  onSelect={() => toggleItemSelection(watchlistItem.id)}
                  onRemove={enableRemove ? () => {
                    setItemToRemove({
                      tmdbId: watchlistItem.tmdbId,
                      mediaType: watchlistItem.mediaType,
                      title: watchlistItem.title,
                    });
                  } : undefined}
                  onItemClick={() => {
                    if (isEditMode) {
                      toggleItemSelection(watchlistItem.id);
                    } else {
                      setSelectedItem({ item, type });
                    }
                  }}
                  onDragStart={() => setDraggedItemId(watchlistItem.id)}
                  onDragEnd={() => {
                    setDraggedItemId(null);
                    setDragOverItemId(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedItemId && draggedItemId !== watchlistItem.id) {
                      setDragOverItemId(watchlistItem.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverItemId === watchlistItem.id) {
                      setDragOverItemId(null);
                    }
                  }}
                  onDrop={async () => {
                    if (!draggedItemId || draggedItemId === watchlistItem.id || !isEditMode) return;
                    
                    const draggedIndex = filteredAndSorted.findIndex(({ watchlistItem: item }) => item.id === draggedItemId);
                    const dropIndex = index;
                    
                    if (draggedIndex === -1 || draggedIndex === dropIndex) return;
                    
                    // Create new array with reordered items
                    const reordered = [...filteredAndSorted];
                    const [draggedItem] = reordered.splice(draggedIndex, 1);
                    reordered.splice(dropIndex, 0, draggedItem);
                    
                    // Assign sequential order numbers (1-based)
                    const itemsToUpdate = reordered.map(({ watchlistItem: item }, idx) => ({
                      id: item.id,
                      order: idx + 1,
                    }));
                    
                    try {
                      await reorderWatchlist.mutateAsync(itemsToUpdate);
                      toast.success("Watchlist reordered");
                    } catch (error) {
                      toast.error("Failed to reorder watchlist");
                      console.error(error);
                    }
                    
                    setDraggedItemId(null);
                    setDragOverItemId(null);
                  }}
                  isDragging={draggedItemId === watchlistItem.id}
                  isDragOver={dragOverItemId === watchlistItem.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>


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

      {/* Copy to List Modal */}
      {isCopyModalOpen && (
        <CopyToListModal
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          selectedItems={Array.from(selectedItems).map(id => {
            const found = filteredAndSorted.find(({ watchlistItem }) => watchlistItem.id === id);
            return found ? { 
              tmdbId: found.watchlistItem.tmdbId, 
              mediaType: found.watchlistItem.mediaType,
              title: found.watchlistItem.title,
              posterPath: found.watchlistItem.posterPath,
              backdropPath: found.watchlistItem.backdropPath,
              releaseDate: found.watchlistItem.releaseDate,
              firstAirDate: found.watchlistItem.firstAirDate,
            } : null;
          }).filter(Boolean) as Array<{
            tmdbId: number;
            mediaType: "movie" | "tv";
            title: string;
            posterPath: string | null;
            backdropPath: string | null;
            releaseDate: string | null;
            firstAirDate: string | null;
          }>}
          onSuccess={() => {
            setIsCopyModalOpen(false);
            setSelectedItems(new Set());
          }}
        />
      )}

      {/* Move to List Modal */}
      {isMoveModalOpen && (
        <MoveToListModal
          isOpen={isMoveModalOpen}
          onClose={() => setIsMoveModalOpen(false)}
          selectedItems={Array.from(selectedItems).map(id => {
            const found = filteredAndSorted.find(({ watchlistItem }) => watchlistItem.id === id);
            return found ? { 
              id: found.watchlistItem.id,
              tmdbId: found.watchlistItem.tmdbId, 
              mediaType: found.watchlistItem.mediaType,
              title: found.watchlistItem.title,
              posterPath: found.watchlistItem.posterPath,
              backdropPath: found.watchlistItem.backdropPath,
              releaseDate: found.watchlistItem.releaseDate,
              firstAirDate: found.watchlistItem.firstAirDate,
            } : null;
          }).filter(Boolean) as Array<{
            id: string;
            tmdbId: number;
            mediaType: "movie" | "tv";
            title: string;
            posterPath: string | null;
            backdropPath: string | null;
            releaseDate: string | null;
            firstAirDate: string | null;
          }>}
          onRemove={onRemove}
          onSuccess={() => {
            setIsMoveModalOpen(false);
            setSelectedItems(new Set());
          }}
        />
      )}
    </>
  );
}

// Detailed Watchlist Item Component
interface DetailedWatchlistItemProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  watchlistItem: WatchlistItem;
  isEditMode: boolean;
  isSelected: boolean;
  order?: number;
  index: number;
  onSelect: () => void;
  onRemove?: () => void;
  onItemClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  isDragging: boolean;
  isDragOver: boolean;
}

function DetailedWatchlistItem({
  item,
  type,
  watchlistItem,
  isEditMode,
  isSelected,
  order,
  index,
  onSelect,
  onRemove,
  onItemClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragging,
  isDragOver,
}: DetailedWatchlistItemProps) {
  const { isSignedIn } = useUser();
  const quickWatch = useQuickWatch();
  const unwatch = useUnwatch();
  const { data: watchedData } = useIsWatched(item.id, type);
  const isWatched = watchedData?.isWatched || false;
  const watchedLogId = watchedData?.logId || null;
  
  // Fetch details for synopsis, director, and cast
  const { data: movieDetails } = useMovieDetails(type === "movie" ? item.id : null);
  const { data: tvDetails } = useTVDetails(type === "tv" ? item.id : null);
  const details = type === "movie" ? movieDetails : tvDetails;
  
  // Type assertion for credits (they're included via append_to_response but not in types)
  const detailsWithCredits = details as (typeof details & {
    credits?: {
      cast?: Array<{ id: number; name: string; character: string; profile_path: string | null }>;
      crew?: Array<{ id: number; name: string; job: string; department: string; profile_path: string | null }>;
    };
    external_ids?: { imdb_id?: string | null };
  }) | null;
  
  // Fetch IMDb rating
  const imdbId = detailsWithCredits?.external_ids?.imdb_id || details?.imdb_id || null;
  const tmdbRating = item.vote_average > 0 ? item.vote_average : null;
  const { data: ratingData } = useIMDBRating(imdbId, tmdbRating);
  const displayRating = ratingData?.rating || tmdbRating;
  const ratingSource = ratingData?.source || (tmdbRating ? "tmdb" : null);
  
  const releaseYear = watchlistItem.releaseDate 
    ? new Date(watchlistItem.releaseDate).getFullYear() 
    : watchlistItem.firstAirDate 
    ? new Date(watchlistItem.firstAirDate).getFullYear() 
    : null;
  
  // Get synopsis
  const synopsis = details?.overview || item.overview || "";
  const truncatedSynopsis = synopsis.length > 150 
    ? synopsis.slice(0, 150) + "..." 
    : synopsis;
  
  // Get director (for movies) or creator (for TV)
  const director = detailsWithCredits?.credits?.crew?.find((person) => person.job === "Director");
  const creator = type === "tv" ? (details as { created_by?: Array<{ id: number; name: string; profile_path: string | null }> })?.created_by?.[0] : null;
  const directorOrCreator = type === "movie" ? director : creator;
  
  // Get top 3 cast members
  const topCast = detailsWithCredits?.credits?.cast?.slice(0, 3) || [];
  
  const handleWatchToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSignedIn) {
      toast.error("Sign in to mark films as watched.");
      return;
    }
    try {
      if (isWatched && watchedLogId) {
        await unwatch.mutateAsync(watchedLogId);
        toast.success("Removed from watched");
      } else {
        const title = "title" in item ? item.title : item.name;
        await quickWatch.mutateAsync({
          tmdbId: item.id,
          mediaType: type,
          title,
          posterPath: item.poster_path || null,
          backdropPath: item.backdrop_path || null,
          releaseDate: "release_date" in item ? item.release_date || null : null,
          firstAirDate: "first_air_date" in item ? item.first_air_date || null : null,
        });
        toast.success("Marked as watched");
      }
    } catch {
      toast.error("Failed to update watched status");
    }
  };
  
  return (
    <div
      draggable={isEditMode}
      onDragStart={(e) => {
        if (isEditMode) {
          onDragStart();
          e.dataTransfer.effectAllowed = "move";
        }
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={cn(
        "flex gap-4 p-4 rounded-lg border border-border bg-card transition-colors group",
        isEditMode && isSelected && "bg-primary/10 border-primary",
        !isEditMode && "cursor-pointer hover:border-primary/50",
        isEditMode && "cursor-move",
        isDragging && "opacity-50",
        isDragOver && "border-primary border-2 bg-primary/5"
      )}
      onClick={onItemClick}
    >
      {isEditMode && (
        <div className="flex-shrink-0">
          <Button
            variant={isSelected ? "default" : "outline"}
            size="icon"
            className={cn(
              "h-6 w-6 cursor-pointer",
              isSelected && "bg-primary"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            {isSelected ? (
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
                <div className="flex items-center gap-3 mb-2">
                  {isEditMode && order !== undefined && (
                    <span className="text-lg font-semibold text-muted-foreground min-w-[2rem]">
                      {order}.
                    </span>
                  )}
                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {watchlistItem.title}
                  </h3>
              {displayRating && displayRating > 0 && (
                <div className="flex items-center gap-1.5">
                  {ratingSource === "imdb" ? (
                    <IMDBBadge size={16} />
                  ) : (
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  )}
                  <span className="text-sm font-semibold">{displayRating.toFixed(1)}</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 cursor-pointer"
                onClick={handleWatchToggle}
              >
                <Eye
                  className={cn(
                    "h-4 w-4",
                    isWatched
                      ? "text-green-500 fill-green-500"
                      : "text-muted-foreground"
                  )}
                />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              {releaseYear && <span>{releaseYear}</span>}
              {releaseYear && <span>•</span>}
              <span className="capitalize">{type}</span>
              <span>•</span>
              <span>Added {format(new Date(watchlistItem.createdAt), "MMM d, yyyy")}</span>
            </div>
            {synopsis && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {truncatedSynopsis}
              </p>
            )}
            {(directorOrCreator || topCast.length > 0) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                {directorOrCreator && (
                  <>
                    <span className="font-medium">Director:</span>
                    <span>{directorOrCreator.name}</span>
                    {topCast.length > 0 && <span>•</span>}
                  </>
                )}
                {topCast.length > 0 && (
                  <>
                    <span className="font-medium">Stars:</span>
                    {topCast.map((actor: { name: string }, index: number) => (
                      <span key={index}>
                        {actor.name}
                        {index < topCast.length - 1 && ", "}
                      </span>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          {!isEditMode && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Copy to List Modal Component
interface CopyToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: Array<{
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string | null;
    backdropPath: string | null;
    releaseDate: string | null;
    firstAirDate: string | null;
  }>;
  onSuccess: () => void;
}

function CopyToListModal({ isOpen, onClose, selectedItems, onSuccess }: CopyToListModalProps) {
  const { data: lists = [], isLoading } = useLists();
  const updateList = useUpdateList();
  const createList = useCreateList();
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newListName, setNewListName] = useState("");
  
  const handleCopy = async () => {
    try {
      if (isCreatingNew) {
        // Create new list with items
        await createList.mutateAsync({
          name: newListName,
          items: selectedItems.map((item, index) => ({
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            title: item.title,
            posterPath: item.posterPath,
            backdropPath: item.backdropPath,
            releaseDate: item.releaseDate,
            firstAirDate: item.firstAirDate,
            position: index + 1,
          })),
        });
        toast.success(`Created new list and copied ${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""}`);
      } else if (selectedListId) {
        // Add items to existing list
        const list = lists.find(l => l.id === selectedListId);
        if (!list) {
          toast.error("List not found");
          return;
        }
        
        const existingItems = list.items || [];
        const newItems = [
          ...existingItems.map(item => ({
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            title: item.title,
            posterPath: item.posterPath,
            backdropPath: item.backdropPath,
            releaseDate: item.releaseDate,
            firstAirDate: item.firstAirDate,
            position: item.position,
          })),
          ...selectedItems.map((item, index) => ({
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            title: item.title,
            posterPath: item.posterPath,
            backdropPath: item.backdropPath,
            releaseDate: item.releaseDate,
            firstAirDate: item.firstAirDate,
            position: existingItems.length + index + 1,
          })),
        ];
        
        await updateList.mutateAsync({
          listId: selectedListId,
          items: newItems,
        });
        toast.success(`Copied ${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""} to list`);
      } else {
        toast.error("Please select a list or create a new one");
        return;
      }
      onSuccess();
    } catch (error) {
      toast.error("Failed to copy items");
      console.error(error);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy to List</DialogTitle>
          <DialogDescription>
            Copy {selectedItems.length} item{selectedItems.length > 1 ? "s" : ""} to a list
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select List</Label>
            <Select value={selectedListId} onValueChange={(value) => {
              setSelectedListId(value);
              setIsCreatingNew(value === "new");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a list or create new" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Create New List</SelectItem>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isCreatingNew && (
            <div className="space-y-2">
              <Label>New List Name</Label>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Enter list name"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            Cancel
          </Button>
          <Button 
            onClick={handleCopy} 
            disabled={isCreatingNew && !newListName.trim() || !isCreatingNew && !selectedListId}
            className="cursor-pointer"
          >
            Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Move to List Modal Component
interface MoveToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: Array<{
    id: string;
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string | null;
    backdropPath: string | null;
    releaseDate: string | null;
    firstAirDate: string | null;
  }>;
  onRemove?: (tmdbId: number, mediaType: "movie" | "tv") => Promise<void>;
  onSuccess: () => void;
}

function MoveToListModal({ isOpen, onClose, selectedItems, onRemove, onSuccess }: MoveToListModalProps) {
  const { data: lists = [] } = useLists();
  const updateList = useUpdateList();
  const createList = useCreateList();
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newListName, setNewListName] = useState("");
  
  const handleMove = async () => {
    try {
      if (isCreatingNew) {
        // Create new list with items
        await createList.mutateAsync({
          name: newListName,
          items: selectedItems.map((item, index) => ({
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            title: item.title,
            posterPath: item.posterPath,
            backdropPath: item.backdropPath,
            releaseDate: item.releaseDate,
            firstAirDate: item.firstAirDate,
            position: index + 1,
          })),
        });
        
        // Remove from watchlist
        if (onRemove) {
          for (const item of selectedItems) {
            await onRemove(item.tmdbId, item.mediaType);
          }
        }
        
        toast.success(`Created new list and moved ${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""}`);
      } else if (selectedListId) {
        // Add items to existing list
        const list = lists.find(l => l.id === selectedListId);
        if (!list) {
          toast.error("List not found");
          return;
        }
        
        const existingItems = list.items || [];
        const newItems = [
          ...existingItems.map(item => ({
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            title: item.title,
            posterPath: item.posterPath,
            backdropPath: item.backdropPath,
            releaseDate: item.releaseDate,
            firstAirDate: item.firstAirDate,
            position: item.position,
          })),
          ...selectedItems.map((item, index) => ({
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            title: item.title,
            posterPath: item.posterPath,
            backdropPath: item.backdropPath,
            releaseDate: item.releaseDate,
            firstAirDate: item.firstAirDate,
            position: existingItems.length + index + 1,
          })),
        ];
        
        await updateList.mutateAsync({
          listId: selectedListId,
          items: newItems,
        });
        
        // Remove from watchlist
        if (onRemove) {
          for (const item of selectedItems) {
            await onRemove(item.tmdbId, item.mediaType);
          }
        }
        
        toast.success(`Moved ${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""} to list`);
      } else {
        toast.error("Please select a list or create a new one");
        return;
      }
      onSuccess();
    } catch (error) {
      toast.error("Failed to move items");
      console.error(error);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to List</DialogTitle>
          <DialogDescription>
            Move {selectedItems.length} item{selectedItems.length > 1 ? "s" : ""} to a list (items will be removed from watchlist)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select List</Label>
            <Select value={selectedListId} onValueChange={(value) => {
              setSelectedListId(value);
              setIsCreatingNew(value === "new");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a list or create new" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Create New List</SelectItem>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isCreatingNew && (
            <div className="space-y-2">
              <Label>New List Name</Label>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Enter list name"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            Cancel
          </Button>
          <Button 
            onClick={handleMove} 
            disabled={isCreatingNew && !newListName.trim() || !isCreatingNew && !selectedListId}
            className="cursor-pointer"
          >
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

