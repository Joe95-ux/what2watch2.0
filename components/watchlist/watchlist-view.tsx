"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MovieCard from "@/components/browse/movie-card";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Bookmark,
  Film,
  Tv,
  Trash2,
  Grid3x3,
  Table2,
  List,
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Edit2,
  MoreVertical,
  Download,
  Upload,
  Plus,
  Eye,
  Lock,
  Check,
  Copy,
  Move,
  Star,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import CreateListModal from "@/components/lists/create-list-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { WatchlistItem } from "@/hooks/use-watchlist";
import {
  useMovieDetails,
  useTVDetails,
  useIMDBRating,
  useOMDBData,
} from "@/hooks/use-content-details";
import {
  useIsWatched,
  useQuickWatch,
  useUnwatch,
} from "@/hooks/use-viewing-logs";
import { useUser } from "@clerk/nextjs";
import { IMDBBadge } from "@/components/ui/imdb-badge";
import { useLists, useUpdateList, useCreateList } from "@/hooks/use-lists";
import { useReorderWatchlist, useAddToWatchlist, useUpdateWatchlistItem } from "@/hooks/use-watchlist";
import { reorderWatchlistEntries, type WatchlistEntry } from "@/lib/watchlist-utils";
import { createPersonSlug } from "@/lib/person-utils";
import { useSearch } from "@/hooks/use-search";
import { useDebounce } from "@/hooks/use-debounce";
import { ShareDropdown } from "@/components/ui/share-dropdown";
import { useWatchlistDragDrop } from "@/hooks/use-watchlist-drag-drop";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "../ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChangeOrderModal } from "./change-order-modal";
import { Textarea } from "@/components/ui/textarea";
import ImportWatchlistModal from "./import-watchlist-modal";

type SortField = "listOrder" | "createdAt" | "title" | "releaseYear";
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

  // Persist viewMode and isEditMode in localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("watchlist-viewMode");
      return (saved as ViewMode) || "grid";
    }
    return "grid";
  });

  const [isEditMode, setIsEditMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("watchlist-editMode");
      return saved === "true";
    }
    return false;
  });

  // Save viewMode to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("watchlist-viewMode", viewMode);
    }
  }, [viewMode]);

  // Save isEditMode to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("watchlist-editMode", isEditMode.toString());
    }
  }, [isEditMode]);

  // In edit mode, force detailed view
  const effectiveViewMode = isEditMode ? "detailed" : viewMode;
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortField, setSortField] = useState<SortField>("listOrder");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [itemToRemove, setItemToRemove] = useState<{
    tmdbId: number;
    mediaType: string;
    title: string;
  } | null>(null);
  const [selectedItem, setSelectedItem] = useState<{
    item: TMDBMovie | TMDBSeries;
    type: "movie" | "tv";
  } | null>(null);
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isAddToWatchlistOpen, setIsAddToWatchlistOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const { isSignedIn } = useUser();
  const addToWatchlist = useAddToWatchlist();
  const [isLgScreen, setIsLgScreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 24;
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Check if screen is lg (1024px and up) for drag and drop
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLgScreen(window.innerWidth >= 1024);
    };

    if (typeof window !== "undefined") {
      checkScreenSize();
      window.addEventListener("resize", checkScreenSize);
      return () => window.removeEventListener("resize", checkScreenSize);
    }
  }, []);

  // Search functionality for adding to watchlist
  const debouncedAddSearchQuery = useDebounce(addSearchQuery, 300);
  const { data: searchResults, isLoading: isSearchLoading } = useSearch({
    query: debouncedAddSearchQuery,
    type: "all",
    page: 1,
  });

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

  // Full watchlist sorted by order (for drag and drop reordering)
  const fullSortedByOrder = useMemo(() => {
    const sorted = [...watchlistAsTMDB];
    sorted.sort((a, b) => {
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
      return (
        new Date(b.watchlistItem.createdAt).getTime() -
        new Date(a.watchlistItem.createdAt).getTime()
      );
    });
    return sorted;
  }, [watchlistAsTMDB]);

  // Filter and sort
  const filteredAndSorted = useMemo(() => {
    let filtered = [...watchlistAsTMDB];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((entry) => {
        const title =
          "title" in entry.item ? entry.item.title : entry.item.name;
        return title?.toLowerCase().includes(query);
      });
    }

    // Type filter
    if (filterType !== "all") {
      filtered = filtered.filter((entry) => entry.type === filterType);
    }

    // Sort based on sortField
    if (sortField === "listOrder") {
      // List Order: Sort by order field (Trello-like behavior)
      // Items with order > 0 are sorted by order value (1, 2, 3...)
      // Items without order come after, sorted by createdAt
      filtered.sort((a, b) => {
        const aOrder = a.watchlistItem.order || 0;
        const bOrder = b.watchlistItem.order || 0;

        // If both have order, sort by order value
        if (aOrder > 0 && bOrder > 0) {
          return aOrder - bOrder;
        }

        // Items with order come before items without order
        if (aOrder > 0 && bOrder === 0) return -1;
        if (aOrder === 0 && bOrder > 0) return 1;

        // If neither has order, sort by createdAt as fallback
        return (
          new Date(b.watchlistItem.createdAt).getTime() -
          new Date(a.watchlistItem.createdAt).getTime()
        );
      });
    } else {
      // Other sorts: Sort by the selected field, ignore order
      filtered.sort((a, b) => {
        let aValue: string | number | null;
        let bValue: string | number | null;

        switch (sortField) {
          case "createdAt":
            aValue = new Date(a.watchlistItem.createdAt).getTime();
            bValue = new Date(b.watchlistItem.createdAt).getTime();
            break;
          case "title":
            aValue = (
              "title" in a.item ? a.item.title : a.item.name || ""
            ).toLowerCase();
            bValue = (
              "title" in b.item ? b.item.title : b.item.name || ""
            ).toLowerCase();
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
    }

    return filtered;
  }, [watchlistAsTMDB, searchQuery, filterType, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAndSorted.slice(startIndex, endIndex);
  }, [filteredAndSorted, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, sortField, sortOrder]);

  // Page numbers with ellipsis
  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("ellipsis");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }
      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }
      pages.push(totalPages);
    }
    
    return pages;
  }, [currentPage, totalPages]);

  // Drag and drop hook (after filteredAndSorted is defined)
  // Only enable drag-and-drop when sortField is "listOrder" and in edit mode
  const { DragDropContext, handleDragEnd, isDragEnabled, displayedEntries } =
    useWatchlistDragDrop({
      filteredEntries: filteredAndSorted,
      allEntries: fullSortedByOrder,
      isEditMode: isEditMode && enableEdit && sortField === "listOrder",
      isLgScreen,
    });

  const handleRemove = async () => {
    if (!itemToRemove || !onRemove) return;
    try {
      await onRemove(
        itemToRemove.tmdbId,
        itemToRemove.mediaType as "movie" | "tv"
      );
      toast.success("Removed from watchlist");
      setItemToRemove(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to remove from watchlist";
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
        await onRemove(
          watchlistItem.tmdbId,
          watchlistItem.mediaType as "movie" | "tv"
        );
      }

      toast.success(
        `Removed ${selectedItems.size} item${
          selectedItems.size > 1 ? "s" : ""
        } from watchlist`
      );
      setSelectedItems(new Set());
      setIsEditMode(false);
    } catch (error) {
      toast.error("Failed to remove items");
    }
  };

  const handleExportCSV = async () => {
    try {
      toast.loading("Preparing export...", { id: "export" });
      
      const response = await fetch("/api/watchlist/export");
      if (!response.ok) {
        throw new Error("Failed to export watchlist");
      }

      const { items } = await response.json();

      const headers = [
        "Order",
        "Title",
        "Type",
        "URL",
        "IMDB ID",
        "Release Date",
        "Year",
        "Genre",
        "Description",
        "Directors/Creators",
        "Runtime",
        "IMDB Rating",
        "Note",
        "Date Created",
        "Date Modified",
      ];

      const rows = items.map((item: any) => [
        item.order,
        item.title,
        item.type,
        item.url,
        item.imdbId,
        item.releaseDate,
        item.year,
        item.genre,
        item.description,
        item.directorsCreators,
        item.runtime,
        item.imdbRating,
        item.note,
        item.dateCreated,
        item.dateModified,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row: any[]) => 
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `watchlist-${format(new Date(), "yyyy-MM-dd")}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Watchlist exported to CSV", { id: "export" });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export watchlist", { id: "export" });
    }
  };

  const handleTogglePublic = async (checked: boolean) => {
    if (!onTogglePublic) return;
    try {
      await onTogglePublic(checked);
      toast.success(
        checked ? "Watchlist is now public" : "Watchlist is now private"
      );
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
      setSelectedItems(
        new Set(filteredAndSorted.map(({ watchlistItem }) => watchlistItem.id))
      );
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
  const bannerImage =
    filteredAndSorted.length > 0 &&
    filteredAndSorted[0].watchlistItem.backdropPath
      ? getPosterUrl(
          filteredAndSorted[0].watchlistItem.backdropPath,
          "original"
        )
      : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative -mt-[65px] h-[30vh] min-h-[200px] max-h-[300px] sm:h-[40vh] sm:min-h-[250px] md:h-[50vh] md:min-h-[300px] overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-pink-500/30" />
        </div>
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

  if (!watchlist || (watchlist.length === 0 && !isLoading)) {
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-pink-500/30" />
          )}
        </div>

        {/* Info Section */}
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
            <div className="flex-1">
              {user && !isOwner ? (
                <div className="flex items-center gap-3 mb-4">
                  <Link href={`/users/${user.id}`}>
                    <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 ring-primary transition-all">
                      <AvatarImage
                        src={user.avatarUrl || undefined}
                        alt={user.displayName || user.username || "User"}
                      />
                      <AvatarFallback>
                        {(user.displayName ||
                          user.username ||
                          "U")[0].toUpperCase()}
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
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                      Watchlist
                    </h1>
                  </div>
                </div>
              ) : (
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
                  Watchlist
                </h1>
              )}
              <p className="text-base sm:text-lg text-muted-foreground mb-4 max-w-2xl">
                {user && !isOwner
                  ? `A collection of movies and TV shows ${
                      user.displayName || user.username || "this user"
                    } wants to watch.`
                  : "Your personal collection of movies and TV shows you want to watch. Save titles as you discover them, organize your viewing queue, and never lose track of what to watch next."}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {filteredAndSorted.length} of {watchlist.length}{" "}
                  {watchlist.length === 1 ? "item" : "items"}
                </span>
                {isPublicProp !== undefined && (
                  <>
                    <span>•</span>
                    <span
                      className={
                        isPublicProp ? "text-primary" : "text-muted-foreground"
                      }
                    >
                      {isPublicProp ? "Public" : "Private"}
                    </span>
                  </>
                )}
                {activeFilterCount > 0 && (
                  <>
                    <span>•</span>
                    <Badge variant="secondary" className="text-xs">
                      {activeFilterCount}{" "}
                      {activeFilterCount === 1 ? "filter" : "filters"} active
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="overflow-x-auto max-w-full">
              <div className="flex items-cen gap-2">
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
                <ShareDropdown
                  shareUrl={shareUrl}
                  title={
                    user
                      ? `${
                          user.displayName || user.username || "User"
                        }'s Watchlist`
                      : "Watchlist"
                  }
                  description={
                    user
                      ? `Check out ${
                          user.displayName || user.username || "User"
                        }'s watchlist on What2Watch`
                      : "Check out this watchlist"
                  }
                  onShare={onShare}
                  className="gap-2 cursor-pointer"
                />
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
                    <Label
                      htmlFor="public-toggle"
                      className="text-sm cursor-pointer flex items-center gap-1.5"
                    >
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
                      <Button
                        variant="outline"
                        size="icon"
                        className="cursor-pointer"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {enableEdit && (
                        <DropdownMenuItem
                          onClick={() => setIsEditMode(!isEditMode)}
                          className="cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          {isEditMode ? "Exit Edit Mode" : "Edit"}
                        </DropdownMenuItem>
                      )}
                      {enableExport && (
                        <>
                          <DropdownMenuItem
                            onClick={handleExportCSV}
                            className="cursor-pointer"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setIsImportModalOpen(true)}
                            className="cursor-pointer"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Import CSV
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {isEditMode && enableRemove && (
          <div className="container max-w-7xl mx-auto mt-[1rem] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 py-4 border-b border-border bg-muted/30 rounded-lg px-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="cursor-pointer w-full sm:w-auto"
                >
                  <div className="h-4 w-4 mr-2 flex items-center justify-center">
                    {selectedItems.size === filteredAndSorted.length ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <div className="h-4 w-4 border-2 border-current rounded" />
                    )}
                  </div>
                  {selectedItems.size === filteredAndSorted.length ? (
                    "Deselect All"
                  ) : (
                    "Select All"
                  )}
                </Button>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {selectedItems.size} of {filteredAndSorted.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Popover
                  open={isAddToWatchlistOpen}
                  onOpenChange={setIsAddToWatchlistOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer w-full sm:w-auto hover:bg-primary/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Watchlist
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[400px] p-0 max-w-[calc(100vw-1rem)] mx-[0.5rem] sm:mx-0"
                    align="end"
                  >
                    <div className="p-4 border-b">
                      <Input
                        placeholder="Search movies or TV shows..."
                        value={addSearchQuery}
                        onChange={(e) => setAddSearchQuery(e.target.value)}
                        className="w-full"
                        autoFocus
                      />
                    </div>
                    {debouncedAddSearchQuery.trim() && (
                      <div className="h-auto max-h-[400px] p-2 overflow-y-auto scrollbar-thin">
                        {isSearchLoading ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            Searching...
                          </div>
                        ) : searchResults?.results &&
                          searchResults.results.length > 0 ? (
                          <div className="p-2">
                            {searchResults.results.map((item) => {
                              const isMovie = "title" in item;
                              const title = isMovie ? item.title : item.name;
                              const mediaType = isMovie ? "movie" : "tv";
                              const isInWatchlist = watchlist.some(
                                (w) =>
                                  w.tmdbId === item.id &&
                                  w.mediaType === mediaType
                              );

                              return (
                                <button
                                  key={`${item.id}-${mediaType}`}
                                  onClick={async () => {
                                    if (isInWatchlist) {
                                      toast.error(
                                        `${title} is already in your watchlist`
                                      );
                                      return;
                                    }

                                    try {
                                      await addToWatchlist.mutateAsync({
                                        tmdbId: item.id,
                                        mediaType,
                                        title,
                                        posterPath: item.poster_path || null,
                                        backdropPath:
                                          item.backdrop_path || null,
                                        releaseDate: isMovie
                                          ? item.release_date || undefined
                                          : undefined,
                                        firstAirDate: !isMovie
                                          ? item.first_air_date || undefined
                                          : undefined,
                                      });
                                      toast.success(
                                        `Added ${title} to watchlist`
                                      );
                                      setAddSearchQuery("");
                                      setIsAddToWatchlistOpen(false);
                                    } catch (error) {
                                      toast.error("Failed to add to watchlist");
                                      console.error(error);
                                    }
                                  }}
                                  disabled={
                                    isInWatchlist || addToWatchlist.isPending
                                  }
                                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {item.poster_path ? (
                                    <div className="relative w-12 h-16 rounded overflow-hidden flex-shrink-0 bg-muted">
                                      <Image
                                        src={getPosterUrl(item.poster_path)}
                                        alt={title}
                                        fill
                                        className="object-cover"
                                        sizes="48px"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-12 h-16 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                                      {isMovie ? (
                                        <Film className="h-6 w-6 text-muted-foreground" />
                                      ) : (
                                        <Tv className="h-6 w-6 text-muted-foreground" />
                                      )}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">
                                      {title}
                                    </div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                      <span className="capitalize">
                                        {mediaType}
                                      </span>
                                      {(isMovie
                                        ? item.release_date
                                        : item.first_air_date) && (
                                        <>
                                          <span>•</span>
                                          <span>
                                            {new Date(
                                              isMovie
                                                ? item.release_date!
                                                : item.first_air_date!
                                            ).getFullYear()}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {isInWatchlist ? (
                                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                                  ) : (
                                    <Plus className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No results found
                          </div>
                        )}
                      </div>
                    )}
                    {!debouncedAddSearchQuery.trim() && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Start typing to search for movies or TV shows
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* View Mode Toggle and Filters / Edit Mode Actions */}
          <div className="mb-6 flex flex-col md:flex-row items-start justify-between gap-4">
            {isEditMode && enableEdit ? (
              <div className="overflow-x-auto max-w-full">
                <div className="flex items-center gap-2">
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

            {/* Filters - Condensed Search Bar with Icons */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-80 2xl:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search watchlist..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0">
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}

                  {/* Sort Dropdown */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-7 w-7 cursor-pointer",
                                sortField !== "listOrder" &&
                                  "bg-primary/10 text-primary"
                              )}
                            >
                              <ArrowUpDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSortField("listOrder");
                                setSortOrder("asc");
                              }}
                              className={cn(
                                "cursor-pointer",
                                sortField === "listOrder" &&
                                  "bg-accent"
                              )}
                            >
                              List Order
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSortField("createdAt");
                                setSortOrder("desc");
                              }}
                              className={cn(
                                "cursor-pointer",
                                sortField === "createdAt" &&
                                  sortOrder === "desc" &&
                                  "bg-accent"
                              )}
                            >
                              Recently Added
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSortField("createdAt");
                                setSortOrder("asc");
                              }}
                              className={cn(
                                "cursor-pointer",
                                sortField === "createdAt" &&
                                  sortOrder === "asc" &&
                                  "bg-accent"
                              )}
                            >
                              Oldest Added
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSortField("title");
                                setSortOrder("asc");
                              }}
                              className={cn(
                                "cursor-pointer",
                                sortField === "title" &&
                                  sortOrder === "asc" &&
                                  "bg-accent"
                              )}
                            >
                              Title (A-Z)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSortField("title");
                                setSortOrder("desc");
                              }}
                              className={cn(
                                "cursor-pointer",
                                sortField === "title" &&
                                  sortOrder === "desc" &&
                                  "bg-accent"
                              )}
                            >
                              Title (Z-A)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSortField("releaseYear");
                                setSortOrder("desc");
                              }}
                              className={cn(
                                "cursor-pointer",
                                sortField === "releaseYear" &&
                                  sortOrder === "desc" &&
                                  "bg-accent"
                              )}
                            >
                              Release Year (Newest)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSortField("releaseYear");
                                setSortOrder("asc");
                              }}
                              className={cn(
                                "cursor-pointer",
                                sortField === "releaseYear" &&
                                  sortOrder === "asc" &&
                                  "bg-accent"
                              )}
                            >
                              Release Year (Oldest)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sort by</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Filter Dropdown */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-7 w-7 cursor-pointer",
                                filterType !== "all" &&
                                  "bg-primary/10 text-primary"
                              )}
                            >
                              <Filter className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>
                              Filter by type
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setFilterType("all")}
                              className={cn(
                                "cursor-pointer",
                                filterType === "all" && "bg-accent"
                              )}
                            >
                              All Types
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setFilterType("movie")}
                              className={cn(
                                "cursor-pointer",
                                filterType === "movie" && "bg-accent"
                              )}
                            >
                              Movies
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setFilterType("tv")}
                              className={cn(
                                "cursor-pointer",
                                filterType === "tv" && "bg-accent"
                              )}
                            >
                              TV Shows
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Filter by type</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

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
              <h3 className="text-lg font-semibold mb-2">
                No items match your filters
              </h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters to see more results.
              </p>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="cursor-pointer"
              >
                Clear All Filters
              </Button>
            </div>
          ) : watchlist.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{emptyTitle}</h3>
              <p className="text-muted-foreground mb-4">{emptyDescription}</p>
              {emptyAction}
            </div>
          ) : effectiveViewMode === "grid" ? (
            <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {paginatedData.map(({ item, type, watchlistItem }) => (
                <div key={watchlistItem.id} className="relative">
                  {isEditMode && enableEdit && (
                    <div className="absolute top-2 left-2 z-10">
                      <Button
                        variant={
                          selectedItems.has(watchlistItem.id)
                            ? "default"
                            : "outline"
                        }
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
                    onRemove={
                      enableRemove
                        ? () => {
                            setItemToRemove({
                              tmdbId: watchlistItem.tmdbId,
                              mediaType: watchlistItem.mediaType,
                              title: watchlistItem.title,
                            });
                          }
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 w-full overflow-auto px-2 py-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex-shrink-0"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {pageNumbers.map((page, index) => {
                    if (page === "ellipsis") {
                      return (
                        <span key={`ellipsis-${index}`} className="text-muted-foreground px-2">
                          ...
                        </span>
                      );
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="min-w-[40px] flex-shrink-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex-shrink-0"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
            </>
          ) : effectiveViewMode === "table" ? (
            <>
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
                          {sortField === "title" ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="h-3 w-3 ml-1" />
                            ) : (
                              <ArrowDown className="h-3 w-3 ml-1" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 ml-1" />
                          )}
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
                          {sortField === "releaseYear" ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="h-3 w-3 ml-1" />
                            ) : (
                              <ArrowDown className="h-3 w-3 ml-1" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 ml-1" />
                          )}
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
                          {sortField === "createdAt" ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="h-3 w-3 ml-1" />
                            ) : (
                              <ArrowDown className="h-3 w-3 ml-1" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 ml-1" />
                          )}
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
                    {paginatedData.map(({ type, watchlistItem }) => {
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
                            isEditMode &&
                              selectedItems.has(watchlistItem.id) &&
                              "bg-primary/10"
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
                                variant={
                                  selectedItems.has(watchlistItem.id)
                                    ? "default"
                                    : "outline"
                                }
                                size="icon"
                                className={cn(
                                  "h-6 w-6 cursor-pointer",
                                  selectedItems.has(watchlistItem.id) &&
                                    "bg-primary"
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
                              {format(
                                new Date(watchlistItem.createdAt),
                                "MMM d, yyyy"
                              )}
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
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 w-full overflow-auto px-2 py-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex-shrink-0"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {pageNumbers.map((page, index) => {
                    if (page === "ellipsis") {
                      return (
                        <span key={`ellipsis-${index}`} className="text-muted-foreground px-2">
                          ...
                        </span>
                      );
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="min-w-[40px] flex-shrink-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex-shrink-0"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
            </>
          ) : (
            // Detailed View
            <>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="watchlist-items">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    {(isDragEnabled ? displayedEntries : paginatedData).map(
                      (entry: WatchlistEntry | { item: TMDBMovie | TMDBSeries; type: "movie" | "tv"; watchlistItem: WatchlistItem }, index) => {
                        // When drag is enabled, entry is WatchlistEntry; otherwise it's the paginated format
                        let item: TMDBMovie | TMDBSeries;
                        let type: "movie" | "tv";
                        let watchlistItem: WatchlistItem;
                        
                        if (isDragEnabled) {
                          const watchlistEntry = entry as WatchlistEntry;
                          item = watchlistEntry.item as TMDBMovie | TMDBSeries;
                          type = watchlistEntry.type;
                          watchlistItem = watchlistEntry.watchlistItem;
                        } else {
                          const paginatedEntry = entry as { item: TMDBMovie | TMDBSeries; type: "movie" | "tv"; watchlistItem: WatchlistItem };
                          item = paginatedEntry.item;
                          type = paginatedEntry.type;
                          watchlistItem = paginatedEntry.watchlistItem;
                        }
                        // When drag is enabled, use actual index; otherwise use paginated index
                        const actualIndex = isDragEnabled
                          ? index
                          : (currentPage - 1) * ITEMS_PER_PAGE + index;
                        return (
                        <Draggable
                          key={watchlistItem.id}
                          draggableId={watchlistItem.id}
                          index={index}
                          isDragDisabled={!isDragEnabled}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                snapshot.isDragging ? "opacity-50" : "",
                                isDragEnabled && "cursor-grab active:cursor-grabbing"
                              )}
                            >
                              <DetailedWatchlistItem
                                item={item}
                                type={type}
                                watchlistItem={watchlistItem}
                                isEditMode={isEditMode && enableEdit}
                                isSelected={selectedItems.has(watchlistItem.id)}
                                order={
                                  sortField === "listOrder" &&
                                  watchlistItem.order && watchlistItem.order > 0
                                    ? watchlistItem.order
                                    : undefined
                                }
                                index={actualIndex}
                                totalItems={filteredAndSorted.length}
                                onSelect={() =>
                                  toggleItemSelection(watchlistItem.id)
                                }
                                onRemove={
                                  enableRemove
                                    ? () => {
                                        setItemToRemove({
                                          tmdbId: watchlistItem.tmdbId,
                                          mediaType: watchlistItem.mediaType,
                                          title: watchlistItem.title,
                                        });
                                      }
                                    : undefined
                                }
                                onItemClick={() => {
                                  if (isEditMode) {
                                    toggleItemSelection(watchlistItem.id);
                                  } else {
                                    setSelectedItem({ item, type });
                                  }
                                }}
                                isLgScreen={isLgScreen}
                                isPublic={isPublicProp}
                                sortField={sortField}
                              />
                            </div>
                          )}
                        </Draggable>
                        );
                      }
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            {totalPages > 1 && !isDragEnabled && (
              <div className="flex items-center justify-center gap-2 mt-8 w-full overflow-auto px-2 py-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex-shrink-0"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {pageNumbers.map((page, index) => {
                    if (page === "ellipsis") {
                      return (
                        <span key={`ellipsis-${index}`} className="text-muted-foreground px-2">
                          ...
                        </span>
                      );
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="min-w-[40px] flex-shrink-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex-shrink-0"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
            </>
          )
        }
        </div>
      </div>

      {/* Remove Confirmation Dialog */}
      {enableRemove && (
        <Dialog
          open={!!itemToRemove}
          onOpenChange={(open) => !open && setItemToRemove(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove from Watchlist</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove &quot;{itemToRemove?.title}
                &quot; from your watchlist?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setItemToRemove(null)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemove}
                className="cursor-pointer"
              >
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

      {/* Import Watchlist Modal */}
      {enableExport && (
        <ImportWatchlistModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
        />
      )}

      {/* Copy to List Modal */}
      {isCopyModalOpen && (
        <CopyToListModal
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          selectedItems={
            Array.from(selectedItems)
              .map((id) => {
                const found = filteredAndSorted.find(
                  ({ watchlistItem }) => watchlistItem.id === id
                );
                return found
                  ? {
                      tmdbId: found.watchlistItem.tmdbId,
                      mediaType: found.watchlistItem.mediaType,
                      title: found.watchlistItem.title,
                      posterPath: found.watchlistItem.posterPath,
                      backdropPath: found.watchlistItem.backdropPath,
                      releaseDate: found.watchlistItem.releaseDate,
                      firstAirDate: found.watchlistItem.firstAirDate,
                    }
                  : null;
              })
              .filter(Boolean) as Array<{
              tmdbId: number;
              mediaType: "movie" | "tv";
              title: string;
              posterPath: string | null;
              backdropPath: string | null;
              releaseDate: string | null;
              firstAirDate: string | null;
            }>
          }
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
          selectedItems={
            Array.from(selectedItems)
              .map((id) => {
                const found = filteredAndSorted.find(
                  ({ watchlistItem }) => watchlistItem.id === id
                );
                return found
                  ? {
                      id: found.watchlistItem.id,
                      tmdbId: found.watchlistItem.tmdbId,
                      mediaType: found.watchlistItem.mediaType,
                      title: found.watchlistItem.title,
                      posterPath: found.watchlistItem.posterPath,
                      backdropPath: found.watchlistItem.backdropPath,
                      releaseDate: found.watchlistItem.releaseDate,
                      firstAirDate: found.watchlistItem.firstAirDate,
                    }
                  : null;
              })
              .filter(Boolean) as Array<{
              id: string;
              tmdbId: number;
              mediaType: "movie" | "tv";
              title: string;
              posterPath: string | null;
              backdropPath: string | null;
              releaseDate: string | null;
              firstAirDate: string | null;
            }>
          }
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
  totalItems: number;
  onSelect: () => void;
  onRemove?: () => void;
  onItemClick: () => void;
  isLgScreen: boolean;
  isPublic?: boolean;
  sortField: SortField;
}

function DetailedWatchlistItem({
  item,
  type,
  watchlistItem,
  isEditMode,
  isSelected,
  order,
  index,
  totalItems,
  onSelect,
  onRemove,
  onItemClick,
  isLgScreen,
  isPublic,
  sortField,
}: DetailedWatchlistItemProps) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const quickWatch = useQuickWatch();
  const unwatch = useUnwatch();
  const { data: watchedData } = useIsWatched(item.id, type);
  const isWatched = watchedData?.isWatched || false;
  const watchedLogId = watchedData?.logId || null;
  
  // Note editing state
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(watchlistItem.note || "");
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const updateWatchlistItem = useUpdateWatchlistItem();
  
  // Update note value when watchlistItem changes
  useEffect(() => {
    setNoteValue(watchlistItem.note || "");
  }, [watchlistItem.note]);

  // Fetch details for synopsis, director, and cast
  const { data: movieDetails } = useMovieDetails(
    type === "movie" ? item.id : null
  );
  const { data: tvDetails } = useTVDetails(type === "tv" ? item.id : null);
  const details = type === "movie" ? movieDetails : tvDetails;

  // Type assertion for credits (they're included via append_to_response but not in types)
  const detailsWithCredits = details as
    | (typeof details & {
        credits?: {
          cast?: Array<{
            id: number;
            name: string;
            character: string;
            profile_path: string | null;
          }>;
          crew?: Array<{
            id: number;
            name: string;
            job: string;
            department: string;
            profile_path: string | null;
          }>;
        };
        external_ids?: { imdb_id?: string | null };
        runtime?: number;
        episode_run_time?: number[];
        release_date?: string;
        first_air_date?: string;
      })
    | null;

  // Fetch IMDb rating and OMDB data
  const imdbId =
    detailsWithCredits?.external_ids?.imdb_id || details?.imdb_id || null;
  const tmdbRating = item.vote_average > 0 ? item.vote_average : null;
  const { data: ratingData } = useIMDBRating(imdbId, tmdbRating);
  const { data: omdbData } = useOMDBData(imdbId);
  const displayRating = ratingData?.rating || tmdbRating;
  const ratingSource = ratingData?.source || (tmdbRating ? "tmdb" : null);

  // Get rated and metascore from OMDB
  const rated = omdbData?.rated || null;
  const metascore = omdbData?.metascore || null;

  // Get number of episodes for TV shows
  const numberOfEpisodes =
    type === "tv"
      ? (details as { number_of_episodes?: number })?.number_of_episodes || null
      : null;

  // Get release date
  const releaseDate =
    type === "movie"
      ? detailsWithCredits?.release_date || watchlistItem.releaseDate
      : detailsWithCredits?.first_air_date || watchlistItem.firstAirDate;
  const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : null;
  const formattedReleaseDate = releaseDate
    ? format(new Date(releaseDate), "MMM d, yyyy")
    : null;

  // Get runtime
  const runtime =
    type === "movie"
      ? detailsWithCredits?.runtime
      : detailsWithCredits?.episode_run_time?.[0];
  const formattedRuntime = runtime
    ? `${Math.floor(runtime / 60)}h ${runtime % 60}m`
    : null;

  // Get synopsis
  const synopsis = details?.overview || item.overview || "";

  // Get director (for movies) or creator (for TV)
  const director = detailsWithCredits?.credits?.crew?.find(
    (person) => person.job === "Director"
  );
  const creator =
    type === "tv"
      ? (
          details as {
            created_by?: Array<{
              id: number;
              name: string;
              profile_path: string | null;
            }>;
          }
        )?.created_by?.[0]
      : null;
  const directorOrCreator = type === "movie" ? director : creator;

  // Get top 3 cast members with IDs
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
          releaseDate:
            "release_date" in item ? item.release_date || null : null,
          firstAirDate:
            "first_air_date" in item ? item.first_air_date || null : null,
        });
        toast.success("Marked as watched");
      }
    } catch {
      toast.error("Failed to update watched status");
    }
  };

  const handleNoteSave = async () => {
    try {
      await updateWatchlistItem.mutateAsync({
        itemId: watchlistItem.id,
        updates: { note: noteValue || null },
      });
      setIsEditingNote(false);
      toast.success("Note saved");
    } catch {
      toast.error("Failed to save note");
    }
  };

  const handleNoteCancel = () => {
    setNoteValue(watchlistItem.note || "");
    setIsEditingNote(false);
  };

  const handleOrderChange = async (newOrder: number) => {
    await updateWatchlistItem.mutateAsync({
      itemId: watchlistItem.id,
      updates: { order: newOrder },
    });
  };

  const formattedAddedDate = format(new Date(watchlistItem.createdAt), "MMM d, yyyy");

  return (
    <div
      className={cn(
        "relative flex gap-4 p-4 rounded-lg border border-border bg-card transition-all group",
        isEditMode && isSelected && "bg-primary/10 border-primary",
        !isEditMode && "cursor-pointer hover:border-primary/50"
      )}
      onClick={(e) => {
        // Don't trigger item click if clicking on interactive elements
        const target = e.target as HTMLElement;
        if (target.closest('button, a, input, select, textarea')) {
          return;
        }
        onItemClick();
      }}
    >
      {isEditMode && isLgScreen && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* Grab Handle - Visual indicator only, whole card is draggable - Only show when sortField is listOrder */}
          {sortField === "listOrder" && (
            <div className="text-muted-foreground">
              <GripVertical className="h-5 w-5" />
            </div>
          )}

          {/* Checkbox */}
          <Button
            variant={isSelected ? "default" : "outline"}
            size="icon"
            className={cn("h-6 w-6 cursor-pointer", isSelected && "bg-primary")}
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
      {/* Layout: Poster and Content */}
      {/* Mobile: Two divs - First div: Poster + First 3 Lines, Second div: Synopsis + Cast */}
      {/* Desktop: Single row with all content */}
      <div className="flex flex-col sm:flex-row gap-4 flex-1 min-w-0">
        {/* First Div: Poster + First 3 Lines (Mobile) or Poster only (Desktop) */}
        <div className="flex flex-row gap-4 flex-1 min-w-0">
          {/* Checkbox for smaller screens (mobile) */}
          {isEditMode && !isLgScreen && (
            <div className="flex-shrink-0 flex items-start pt-1">
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
          {/* Poster */}
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

          {/* First 3 Lines */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Line 1: Order. Title */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {order !== undefined && (
                <span className="text-sm text-muted-foreground">
                  {(order && order > 0) ? order : index + 1}.
                </span>
              )}
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors truncate sm:truncate-none">
                {watchlistItem.title}
              </h3>
              {isEditMode && (
                <>
                  <Badge variant="secondary" className="text-xs">
                    Added {formattedAddedDate}
                  </Badge>
                  {sortField === "listOrder" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOrderModalOpen(true);
                      }}
                    >
                      <ArrowUpDown className="h-3 w-3 mr-1" />
                      Change Order
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Line 2: Release year, runtime/episodes, rated, metascore */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
              {releaseYear && <span>{releaseYear}</span>}
              {type === "movie"
                ? formattedRuntime && (
                    <>
                      {releaseYear && <span>•</span>}
                      <span>{formattedRuntime}</span>
                    </>
                  )
                : numberOfEpisodes && (
                    <>
                      {releaseYear && <span>•</span>}
                      <span>{numberOfEpisodes} episodes</span>
                    </>
                  )}
              {rated && (
                <>
                  {(releaseYear || formattedRuntime || numberOfEpisodes) && (
                    <span>•</span>
                  )}
                  <span>{rated}</span>
                </>
              )}
              {metascore && (
                <>
                  {(releaseYear ||
                    formattedRuntime ||
                    numberOfEpisodes ||
                    rated) && <span>•</span>}
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center text-xs font-bold",
                        metascore >= 60
                          ? "bg-green-500 text-white"
                          : metascore >= 40
                          ? "bg-yellow-500 text-white"
                          : "bg-red-500 text-white"
                      )}
                    >
                      {metascore}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Metascore
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Line 3: IMDb rating and watched status */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
              {displayRating && displayRating > 0 && (
                <div className="flex items-center gap-1.5">
                  {ratingSource === "imdb" ? (
                    <IMDBBadge size={16} />
                  ) : (
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  )}
                  <span className="font-semibold">
                    {displayRating.toFixed(1)}
                  </span>
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
                    isWatched ? "text-green-500" : "text-muted-foreground"
                  )}
                />
              </Button>
              {isWatched ? (
                <span className="text-sm text-muted-foreground">Watched</span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Mark as watched
                </span>
              )}
            </div>

            {/* Desktop: Note (edit mode) or Synopsis and Cast (view mode) */}
            <div className="hidden sm:block">
              {isEditMode ? (
                <div className="space-y-2">
                  {isEditingNote ? (
                    <div className="space-y-2">
                      <Textarea
                        value={noteValue}
                        onChange={(e) => setNoteValue(e.target.value)}
                        placeholder="Add a note..."
                        className="min-h-[80px] resize-none"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            handleNoteCancel();
                          } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            handleNoteSave();
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNoteSave();
                          }}
                          disabled={updateWatchlistItem.isPending}
                          className="cursor-pointer"
                        >
                          {updateWatchlistItem.isPending ? (
                            <>
                              <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNoteCancel();
                          }}
                          disabled={updateWatchlistItem.isPending}
                          className="cursor-pointer"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingNote(true);
                      }}
                      className={cn(
                        "border-l-4 border-primary/50 pl-4 py-2 text-sm text-muted-foreground cursor-text hover:border-primary/80 transition-colors rounded-r",
                        "bg-muted/50 hover:bg-muted/70",
                        !watchlistItem.note && "text-muted-foreground/50 italic"
                      )}
                    >
                      {watchlistItem.note || "Click to add a note..."}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {synopsis && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {synopsis}
                    </p>
                  )}
                  {(directorOrCreator || topCast.length > 0) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      {directorOrCreator && (
                        <>
                          <span className="font-medium">{type === "movie" ? "Director:" : "Creator:"}</span>
                          {directorOrCreator.id ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/person/${createPersonSlug(
                                    directorOrCreator.id,
                                    directorOrCreator.name
                                  )}`
                                );
                              }}
                              className="text-primary underline hover:text-primary/80 transition-colors"
                            >
                              {directorOrCreator.name}
                            </button>
                          ) : (
                            <span>{directorOrCreator.name}</span>
                          )}
                          {topCast.length > 0 && <span>•</span>}
                        </>
                      )}
                      {topCast.length > 0 && (
                        <>
                          <span className="font-medium">Stars:</span>
                          {topCast.map(
                            (
                              actor: { id: number; name: string },
                              index: number
                            ) => (
                              <span key={actor.id}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(
                                      `/person/${createPersonSlug(
                                        actor.id,
                                        actor.name
                                      )}`
                                    );
                                  }}
                                  className="text-primary underline hover:text-primary/80 transition-colors"
                                >
                                  {actor.name}
                                </button>
                                {index < topCast.length - 1 && ", "}
                              </span>
                            )
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {watchlistItem.note && (
                    <div
                      className={cn(
                        "mt-2 border-l-4 pl-4 py-2 text-sm rounded-r",
                        isPublic
                          ? "bg-blue-500/20 border-blue-500/30 text-blue-700 dark:text-blue-400"
                          : "bg-orange-500/20 border-orange-500/30 text-orange-700 dark:text-orange-400"
                      )}
                    >
                      {watchlistItem.note}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Second Div: Note (edit mode) or Synopsis and Cast (mobile only, view mode) */}
        <div className="flex flex-col sm:hidden gap-2">
          {isEditMode ? (
            <div className="space-y-2">
              {isEditingNote ? (
                <div className="space-y-2">
                  <Textarea
                    value={noteValue}
                    onChange={(e) => setNoteValue(e.target.value)}
                    placeholder="Add a note..."
                    className="min-h-[80px] resize-none"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        handleNoteCancel();
                      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleNoteSave();
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNoteSave();
                      }}
                      disabled={updateWatchlistItem.isPending}
                      className="cursor-pointer"
                    >
                      {updateWatchlistItem.isPending ? (
                        <>
                          <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNoteCancel();
                      }}
                      disabled={updateWatchlistItem.isPending}
                      className="cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingNote(true);
                  }}
                  className={cn(
                    "border-l-4 border-primary/50 pl-4 py-2 text-sm text-muted-foreground cursor-text hover:border-primary/80 transition-colors rounded-r",
                    "bg-muted/50 hover:bg-muted/70",
                    !watchlistItem.note && "text-muted-foreground/50 italic"
                  )}
                >
                  {watchlistItem.note || "Click to add a note..."}
                </div>
              )}
            </div>
          ) : (
            <>
              {synopsis && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {synopsis}
                </p>
              )}
              {(directorOrCreator || topCast.length > 0) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                  {directorOrCreator && (
                    <>
                      <span className="font-medium">{type === "movie" ? "Director:" : "Creator:"}</span>
                      {director && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/person/${createPersonSlug(
                                director.id,
                                director.name
                              )}`
                            );
                          }}
                          className="text-primary underline hover:text-primary/80 transition-colors"
                        >
                          {directorOrCreator.name}
                        </button>
                      )}
                      {!director && <span>{directorOrCreator.name}</span>}
                      {topCast.length > 0 && <span>•</span>}
                    </>
                  )}
                  {topCast.length > 0 && (
                    <>
                      <span className="font-medium">Stars:</span>
                      {topCast.map(
                        (actor: { id: number; name: string }, index: number) => (
                          <span key={actor.id}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/person/${createPersonSlug(
                                    actor.id,
                                    actor.name
                                  )}`
                                );
                              }}
                              className="text-primary underline hover:text-primary/80 transition-colors"
                            >
                              {actor.name}
                            </button>
                            {index < topCast.length - 1 && ", "}
                          </span>
                        )
                      )}
                    </>
                  )}
                </div>
              )}
              {watchlistItem.note && (
                <div
                  className={cn(
                    "mt-2 border-l-4 pl-4 py-2 text-sm rounded-r",
                    isPublic
                      ? "bg-blue-500/20 border-blue-500/30 text-blue-700 dark:text-blue-400"
                      : "bg-orange-500/20 border-orange-500/30 text-orange-700 dark:text-orange-400"
                  )}
                >
                  {watchlistItem.note}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {!isEditMode && onRemove && (
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              if (onRemove) onRemove();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      <ChangeOrderModal
        open={isOrderModalOpen}
        onOpenChange={setIsOrderModalOpen}
        currentOrder={watchlistItem.order || 0}
        maxOrder={totalItems}
        title={watchlistItem.title}
        onConfirm={handleOrderChange}
      />
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

function CopyToListModal({
  isOpen,
  onClose,
  selectedItems,
  onSuccess,
}: CopyToListModalProps) {
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
        toast.success(
          `Created new list and copied ${selectedItems.length} item${
            selectedItems.length > 1 ? "s" : ""
          }`
        );
      } else if (selectedListId) {
        // Add items to existing list
        const list = lists.find((l) => l.id === selectedListId);
        if (!list) {
          toast.error("List not found");
          return;
        }

        const existingItems = list.items || [];
        const newItems = [
          ...existingItems.map((item) => ({
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
        toast.success(
          `Copied ${selectedItems.length} item${
            selectedItems.length > 1 ? "s" : ""
          } to list`
        );
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
            Copy {selectedItems.length} item
            {selectedItems.length > 1 ? "s" : ""} to a list
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select List</Label>
            <Select
              value={selectedListId}
              onValueChange={(value) => {
                setSelectedListId(value);
                setIsCreatingNew(value === "new");
              }}
            >
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
          <Button
            variant="outline"
            onClick={onClose}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCopy}
            disabled={
              (isCreatingNew && !newListName.trim()) ||
              (!isCreatingNew && !selectedListId) ||
              createList.isPending ||
              updateList.isPending
            }
            className="cursor-pointer"
          >
            {createList.isPending || updateList.isPending ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Copying...
              </>
            ) : (
              "Copy"
            )}
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

function MoveToListModal({
  isOpen,
  onClose,
  selectedItems,
  onRemove,
  onSuccess,
}: MoveToListModalProps) {
  const { data: lists = [] } = useLists();
  const updateList = useUpdateList();
  const createList = useCreateList();
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);

  const handleMove = async () => {
    setIsRemoving(true);
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

        toast.success(
          `Created new list and moved ${selectedItems.length} item${
            selectedItems.length > 1 ? "s" : ""
          }`
        );
      } else if (selectedListId) {
        // Add items to existing list
        const list = lists.find((l) => l.id === selectedListId);
        if (!list) {
          toast.error("List not found");
          return;
        }

        const existingItems = list.items || [];
        const newItems = [
          ...existingItems.map((item) => ({
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

        toast.success(
          `Moved ${selectedItems.length} item${
            selectedItems.length > 1 ? "s" : ""
          } to list`
        );
      } else {
        toast.error("Please select a list or create a new one");
        return;
      }
      onSuccess();
    } catch (error) {
      toast.error("Failed to move items");
      console.error(error);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to List</DialogTitle>
          <DialogDescription>
            Move {selectedItems.length} item
            {selectedItems.length > 1 ? "s" : ""} to a list (items will be
            removed from watchlist)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select List</Label>
            <Select
              value={selectedListId}
              onValueChange={(value) => {
                setSelectedListId(value);
                setIsCreatingNew(value === "new");
              }}
            >
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
          <Button
            variant="outline"
            onClick={onClose}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={
              (isCreatingNew && !newListName.trim()) ||
              (!isCreatingNew && !selectedListId) ||
              createList.isPending ||
              updateList.isPending ||
              isRemoving
            }
            className="cursor-pointer"
          >
            {createList.isPending || updateList.isPending || isRemoving ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Moving...
              </>
            ) : (
              "Move"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
