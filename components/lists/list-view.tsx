"use client";

import { useState, useMemo, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MovieCard from "@/components/browse/movie-card";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Film,
  Tv,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Edit2,
  MoreVertical,
  Download,
  Upload,
  Check,
  GripVertical,
  ArrowLeft,
  Copy,
  Move,
  Plus,
} from "lucide-react";
import Image from "next/image";
import { getPosterUrl, getBackdropUrl } from "@/lib/tmdb";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ListItem, List } from "@/hooks/use-lists";
import { ShareDropdown } from "@/components/ui/share-dropdown";
import { useListDragDrop } from "@/hooks/use-list-drag-drop";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { CollectionBanner } from "@/components/shared/collection-banner";
import { ViewModeToggle, type ViewMode } from "@/components/shared/view-mode-toggle";
import { CollectionPagination } from "@/components/shared/collection-pagination";
import { BulkActionsBar } from "@/components/shared/bulk-actions-bar";
import {
  CollectionFilters,
  type SortField,
  type SortOrder,
  type FilterType,
} from "@/components/shared/collection-filters";
import { useRemoveItemFromList, useReorderList, useUpdateList, useLists, useCreateList, useList } from "@/hooks/use-lists";
import { ChangePositionModal } from "./change-position-modal";
import ImportListModal from "./import-list-modal";
import CreateListModal from "./create-list-modal";
import { reorderListEntries, type ListEntry } from "@/lib/list-utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearch } from "@/hooks/use-search";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ListViewProps {
  list: List | null;
  isLoading: boolean;
  isOwner: boolean;
  enableRemove?: boolean;
  enableEdit?: boolean;
  enableExport?: boolean;
  onRemove?: (itemId: string) => Promise<void>;
  shareUrl: string;
  onShare?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  errorTitle?: string;
  errorDescription?: string;
  errorAction?: React.ReactNode;
  onBack?: () => void;
}

export default function ListView({
  list,
  isLoading,
  isOwner,
  enableRemove = false,
  enableEdit = false,
  enableExport = false,
  onRemove,
  shareUrl,
  onShare,
  emptyTitle = "This list is empty",
  emptyDescription = "No items have been added yet.",
  emptyAction,
  errorTitle = "List not found",
  errorDescription = "This list doesn't exist or is private.",
  errorAction,
  onBack,
}: ListViewProps) {
  const router = useRouter();

  // Persist viewMode and isEditMode in localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("list-viewMode");
      return (saved as ViewMode) || "grid";
    }
    return "grid";
  });

  const [isEditMode, setIsEditMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("list-editMode");
      return saved === "true";
    }
    return false;
  });

  // Save to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("list-viewMode", viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("list-editMode", isEditMode.toString());
    }
  }, [isEditMode]);

  // In edit mode, force detailed view
  const effectiveViewMode = isEditMode ? "detailed" : viewMode;
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortField, setSortField] = useState<SortField>("listOrder");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [itemToRemove, setItemToRemove] = useState<{
    itemId: string;
    title: string;
  } | null>(null);
  const [selectedItem, setSelectedItem] = useState<{
    item: TMDBMovie | TMDBSeries;
    type: "movie" | "tv";
  } | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isLgScreen, setIsLgScreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 24;
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isEditListModalOpen, setIsEditListModalOpen] = useState(false);
  const [isAddToListOpen, setIsAddToListOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const debouncedAddSearchQuery = useDebounce(addSearchQuery, 300);
  const { data: searchResults, isLoading: isSearchLoading } = useSearch({
    query: debouncedAddSearchQuery,
    type: "all",
  });

  const removeItemFromList = useRemoveItemFromList();
  const updateList = useUpdateList();

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

  // Convert list items to TMDB format for display
  const listAsTMDB = useMemo(() => {
    if (!list?.items) return [];
    return list.items.map((item: ListItem) => {
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
        return { item: movie, type: "movie" as const, listItem: item };
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
        return { item: tv, type: "tv" as const, listItem: item };
      }
    });
  }, [list]);

  // Full list sorted by position (for drag and drop reordering)
  const fullSortedByPosition = useMemo(() => {
    const sorted = [...listAsTMDB];
    sorted.sort((a, b) => {
      const aPosition = a.listItem.position || 0;
      const bPosition = b.listItem.position || 0;

      // Items with position come first
      if (aPosition > 0 && bPosition === 0) return -1;
      if (aPosition === 0 && bPosition > 0) return 1;

      // If both have position, sort by position
      if (aPosition > 0 && bPosition > 0) {
        return aPosition - bPosition;
      }

      // If neither has position, sort by createdAt
      return (
        new Date(b.listItem.createdAt).getTime() -
        new Date(a.listItem.createdAt).getTime()
      );
    });
    return sorted;
  }, [listAsTMDB]);

  // Filter and sort
  const filteredAndSorted = useMemo(() => {
    let filtered = [...listAsTMDB];

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
      // List Order: Sort by position field (Trello-like behavior)
      filtered.sort((a, b) => {
        const aPosition = a.listItem.position || 0;
        const bPosition = b.listItem.position || 0;

        // If both have position, sort by position value
        if (aPosition > 0 && bPosition > 0) {
          return aPosition - bPosition;
        }

        // Items with position come before items without position
        if (aPosition > 0 && bPosition === 0) return -1;
        if (aPosition === 0 && bPosition > 0) return 1;

        // If neither has position, sort by createdAt as fallback
        return (
          new Date(b.listItem.createdAt).getTime() -
          new Date(a.listItem.createdAt).getTime()
        );
      });
    } else {
      // Other sorts: Sort by the selected field, ignore position
      filtered.sort((a, b) => {
        let aValue: string | number | null;
        let bValue: string | number | null;

        switch (sortField) {
          case "createdAt":
            aValue = new Date(a.listItem.createdAt).getTime();
            bValue = new Date(b.listItem.createdAt).getTime();
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
            aValue = a.listItem.releaseDate
              ? new Date(a.listItem.releaseDate).getFullYear()
              : a.listItem.firstAirDate
              ? new Date(a.listItem.firstAirDate).getFullYear()
              : 0;
            bValue = b.listItem.releaseDate
              ? new Date(b.listItem.releaseDate).getFullYear()
              : b.listItem.firstAirDate
              ? new Date(b.listItem.firstAirDate).getFullYear()
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
  }, [listAsTMDB, searchQuery, filterType, sortField, sortOrder]);

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
  const { DragDropContext, handleDragEnd, isDragEnabled } = useListDragDrop({
    listId: list?.id || "",
    filteredEntries: filteredAndSorted,
    allEntries: fullSortedByPosition,
    isEditMode: isEditMode && enableEdit && sortField === "listOrder",
    isLgScreen,
    sortField,
  });

  const handleRemove = async () => {
    if (!itemToRemove || !onRemove || !list) return;
    try {
      await onRemove(itemToRemove.itemId);
      toast.success("Removed from list");
      setItemToRemove(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to remove from list";
      toast.error(errorMessage);
    }
  };

  const handleBulkRemove = async () => {
    if (selectedItems.size === 0 || !list) return;
    try {
      const itemsToRemove = filteredAndSorted.filter(({ listItem }) =>
        selectedItems.has(listItem.id)
      );

      for (const { listItem } of itemsToRemove) {
        if (onRemove) {
          await onRemove(listItem.id);
        } else {
          await removeItemFromList.mutateAsync({
            listId: list.id,
            itemId: listItem.id,
          });
        }
      }

      toast.success(
        `Removed ${selectedItems.size} item${
          selectedItems.size > 1 ? "s" : ""
        } from list`
      );
      setSelectedItems(new Set());
      setIsEditMode(false);
    } catch (error) {
      toast.error("Failed to remove items");
    }
  };

  const handleExportCSV = async () => {
    if (!list) return;
    try {
      toast.loading("Preparing export...", { id: "export" });

      const response = await fetch(`/api/lists/${list.id}/export`);
      if (!response.ok) {
        throw new Error("Failed to export list");
      }

      const { items } = await response.json();

      const headers = [
        "Position",
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
        "Date Created",
      ];

      const rows = items.map((item: any) => [
        item.position,
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
        item.dateCreated,
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
        `list-${format(new Date(), "yyyy-MM-dd")}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("List exported to CSV", { id: "export" });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export list", { id: "export" });
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
        new Set(filteredAndSorted.map(({ listItem }) => listItem.id))
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

  // Get banner image
  const bannerImage = list?.coverImage
    ? list.coverImage
    : list && list.items && list.items.length > 0 && list.items[0].backdropPath
    ? getBackdropUrl(list.items[0].backdropPath, "original")
    : list && list.items && list.items.length > 0 && list.items[0].posterPath
    ? getPosterUrl(list.items[0].posterPath, "original")
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <CollectionBanner fallbackGradient />
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

  if (!list || (list.items.length === 0 && !isLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <CollectionBanner fallbackGradient />
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
        <CollectionBanner imageUrl={bannerImage} />

        {/* Info Section */}
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lists
            </Button>
          )}

          <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Link href={`/${list.user.username || list.user.id}`}>
                  <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 ring-primary transition-all">
                    <AvatarImage
                      src={list.user.avatarUrl || undefined}
                      alt={list.user.displayName || list.user.username || "User"}
                    />
                    <AvatarFallback>
                      {(list.user.displayName ||
                        list.user.username ||
                        "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <Link
                    href={`/${list.user.username || list.user.id}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    {list.user.displayName || list.user.username || "Unknown"}
                  </Link>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                      {list.name}
                    </h1>
                    {isEditMode && enableEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => setIsEditListModalOpen(true)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {list.description && (
                <p className="text-base sm:text-lg text-muted-foreground mb-4 max-w-2xl">
                  {list.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span>
                  {filteredAndSorted.length} of {list.items.length}{" "}
                  {list.items.length === 1 ? "item" : "items"}
                </span>
                {list.tags.length > 0 && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-2">
                      {list.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
                <span>•</span>
                <span className="capitalize">
                  {list.visibility.toLowerCase().replace("_", " ")}
                </span>
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
            {isOwner && (
              <div className="overflow-x-auto max-w-full">
                <div className="flex items-center gap-2">
                  <ShareDropdown
                    shareUrl={shareUrl}
                    title={list.name}
                    description={`Check out ${list.name} on What2Watch`}
                    onShare={onShare}
                    className="gap-2 cursor-pointer"
                  />
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
            )}
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
                  {selectedItems.size === filteredAndSorted.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {selectedItems.size} of {filteredAndSorted.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Popover
                  open={isAddToListOpen}
                  onOpenChange={setIsAddToListOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer w-full sm:w-auto hover:bg-primary/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to List
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
                              const isInList = list?.items.some(
                                (i) =>
                                  i.tmdbId === item.id &&
                                  i.mediaType === mediaType
                              );

                              return (
                                <button
                                  key={`${item.id}-${mediaType}`}
                                  onClick={async () => {
                                    if (isInList) {
                                      toast.error(
                                        `${title} is already in this list`
                                      );
                                      return;
                                    }

                                    if (!list) return;

                                    try {
                                      const existingItems = list.items || [];
                                      const newItems = [
                                        ...existingItems.map((i) => ({
                                          tmdbId: i.tmdbId,
                                          mediaType: i.mediaType as "movie" | "tv",
                                          title: i.title,
                                          posterPath: i.posterPath,
                                          backdropPath: i.backdropPath,
                                          releaseDate: i.releaseDate,
                                          firstAirDate: i.firstAirDate,
                                          position: i.position,
                                        })),
                                        {
                                          tmdbId: item.id,
                                          mediaType: mediaType as "movie" | "tv",
                                          title,
                                          posterPath: item.poster_path || null,
                                          backdropPath:
                                            item.backdrop_path || null,
                                          releaseDate: isMovie
                                            ? item.release_date || null
                                            : null,
                                          firstAirDate: !isMovie
                                            ? item.first_air_date || null
                                            : null,
                                          position: existingItems.length + 1,
                                        },
                                      ];

                                      await updateList.mutateAsync({
                                        listId: list.id,
                                        items: newItems,
                                      });
                                      toast.success(
                                        `Added ${title} to list`
                                      );
                                      setAddSearchQuery("");
                                      setIsAddToListOpen(false);
                                    } catch (error) {
                                      toast.error("Failed to add to list");
                                      console.error(error);
                                    }
                                  }}
                                  disabled={isInList || updateList.isPending}
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
                                    <p className="font-medium text-sm truncate">
                                      {title}
                                    </p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {mediaType}
                                    </p>
                                  </div>
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
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCopyModalOpen(true)}
                  disabled={selectedItems.size === 0}
                  className="cursor-pointer w-full sm:w-auto"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy ({selectedItems.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMoveModalOpen(true)}
                  disabled={selectedItems.size === 0}
                  className="cursor-pointer w-full sm:w-auto"
                >
                  <Move className="h-4 w-4 mr-2" />
                  Move ({selectedItems.size})
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkRemove}
                  disabled={selectedItems.size === 0}
                  className="cursor-pointer w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedItems.size})
                </Button>
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
              <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            )}

            {/* Filters */}
            <CollectionFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortField={sortField}
              sortOrder={sortOrder}
              onSortChange={(field, order) => {
                setSortField(field);
                setSortOrder(order);
              }}
              filterType={filterType}
              onFilterChange={setFilterType}
              searchPlaceholder="Search list..."
              showListOrder={true}
            />
          </div>

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="cursor-pointer"
              >
                Clear All Filters
              </Button>
            </div>
          )}

          {/* Content Views */}
          {list.items.length === 0 ? (
            <div className="text-center py-12">
              <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{emptyTitle}</h3>
              <p className="text-muted-foreground mb-4">{emptyDescription}</p>
              {emptyAction}
            </div>
          ) : effectiveViewMode === "grid" ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {paginatedData.map(({ item, type, listItem }) => (
                  <div key={listItem.id} className="relative">
                    {isEditMode && enableEdit && (
                      <div className="absolute top-2 left-2 z-10">
                        <Button
                          variant={
                            selectedItems.has(listItem.id)
                              ? "default"
                              : "outline"
                          }
                          size="icon"
                          className={cn(
                            "h-8 w-8 cursor-pointer",
                            selectedItems.has(listItem.id) && "bg-primary"
                          )}
                          onClick={() => toggleItemSelection(listItem.id)}
                        >
                          {selectedItems.has(listItem.id) ? (
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
                                itemId: listItem.id,
                                title: listItem.title,
                              });
                            }
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
              <CollectionPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageNumbers={pageNumbers}
              />
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
                        {sortField === "listOrder" && (
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {sortField === "listOrder" ? "Position" : ""}
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
                      {paginatedData.map(({ type, listItem }) => {
                        const releaseYear = listItem.releaseDate
                          ? new Date(listItem.releaseDate).getFullYear()
                          : listItem.firstAirDate
                          ? new Date(listItem.firstAirDate).getFullYear()
                          : "—";

                        return (
                          <tr
                            key={listItem.id}
                            className={cn(
                              "hover:bg-muted/20 transition-colors group cursor-pointer",
                              isEditMode &&
                                selectedItems.has(listItem.id) &&
                                "bg-primary/10"
                            )}
                            onClick={() => {
                              if (isEditMode) {
                                toggleItemSelection(listItem.id);
                              } else {
                                router.push(`/${type}/${listItem.tmdbId}`);
                              }
                            }}
                          >
                            {isEditMode && enableEdit && (
                              <td className="px-4 py-4">
                                <Button
                                  variant={
                                    selectedItems.has(listItem.id)
                                      ? "default"
                                      : "outline"
                                  }
                                  size="icon"
                                  className={cn(
                                    "h-6 w-6 cursor-pointer",
                                    selectedItems.has(listItem.id) &&
                                      "bg-primary"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemSelection(listItem.id);
                                  }}
                                >
                                  {selectedItems.has(listItem.id) ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <div className="h-3 w-3 border-2 border-current rounded" />
                                  )}
                                </Button>
                              </td>
                            )}
                            {sortField === "listOrder" && (
                              <td className="px-4 py-4">
                                <span className="text-sm text-muted-foreground">
                                  {listItem.position > 0 ? listItem.position : "—"}
                                </span>
                              </td>
                            )}
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                {listItem.posterPath ? (
                                  <div className="relative w-16 h-24 rounded overflow-hidden flex-shrink-0 bg-muted">
                                    <Image
                                      src={getPosterUrl(listItem.posterPath)}
                                      alt={listItem.title}
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
                                    {listItem.title}
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
                                  new Date(listItem.createdAt),
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
                                      itemId: listItem.id,
                                      title: listItem.title,
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
              <CollectionPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageNumbers={pageNumbers}
              />
            </>
          ) : (
            // Detailed View - will be implemented with DetailedListItem component
            <>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="list-items">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4"
                    >
                      {paginatedData.map(
                        ({ item, type, listItem }, paginatedIndex) => {
                          // Calculate the actual index in the full filteredAndSorted array for drag-and-drop
                          const actualIndex =
                            (currentPage - 1) * ITEMS_PER_PAGE + paginatedIndex;
                          return (
                            <Draggable
                              key={listItem.id}
                              draggableId={listItem.id}
                              index={actualIndex}
                              isDragDisabled={!isDragEnabled}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={cn(
                                    snapshot.isDragging ? "opacity-50" : "",
                                    isDragEnabled &&
                                      "cursor-grab active:cursor-grabbing"
                                  )}
                                >
                                  <DetailedListItem
                                    item={item}
                                    type={type}
                                    listItem={listItem}
                                    listId={list.id}
                                    isEditMode={isEditMode && enableEdit}
                                    isSelected={selectedItems.has(listItem.id)}
                                    position={
                                      sortField === "listOrder" &&
                                      listItem.position &&
                                      listItem.position > 0
                                        ? listItem.position
                                        : undefined
                                    }
                                    index={actualIndex}
                                    totalItems={filteredAndSorted.length}
                                    onSelect={() =>
                                      toggleItemSelection(listItem.id)
                                    }
                                    onRemove={
                                      enableRemove
                                        ? () => {
                                            setItemToRemove({
                                              itemId: listItem.id,
                                              title: listItem.title,
                                            });
                                          }
                                        : undefined
                                    }
                                    onItemClick={() => {
                                      if (isEditMode) {
                                        toggleItemSelection(listItem.id);
                                      } else {
                                        setSelectedItem({ item, type });
                                      }
                                    }}
                                    isLgScreen={isLgScreen}
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
              <CollectionPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageNumbers={pageNumbers}
              />
            </>
          )}
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
              <DialogTitle>Remove from List</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove &quot;{itemToRemove?.title}
                &quot; from this list?
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

      {/* Content Detail Modal */}
      {selectedItem && (
        <ContentDetailModal
          item={selectedItem.item}
          type={selectedItem.type}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* Import List Modal */}
      {enableExport && list && (
        <ImportListModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          listId={list.id}
          onSuccess={() => {
            // Refresh the list
            window.location.reload();
          }}
        />
      )}

      {/* Edit List Modal (Step 1 only - name, description, tags) */}
      {isEditMode && enableEdit && list && (
        <CreateListModal
          isOpen={isEditListModalOpen}
          onClose={() => setIsEditListModalOpen(false)}
          list={list}
          editOnly={true}
        />
      )}

      {/* Copy to List Modal */}
      {isCopyModalOpen && list && (
        <CopyToListModal
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          selectedItems={Array.from(selectedItems)
            .map((id) => {
              const found = filteredAndSorted.find(
                ({ listItem }) => listItem.id === id
              );
              return found
                ? {
                    tmdbId: found.listItem.tmdbId,
                    mediaType: found.listItem.mediaType,
                    title: found.listItem.title,
                    posterPath: found.listItem.posterPath,
                    backdropPath: found.listItem.backdropPath,
                    releaseDate: found.listItem.releaseDate,
                    firstAirDate: found.listItem.firstAirDate,
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
          }>}
          currentListId={list.id}
          onSuccess={() => {
            setIsCopyModalOpen(false);
            setSelectedItems(new Set());
          }}
        />
      )}

      {/* Move to List Modal */}
      {isMoveModalOpen && list && (
        <MoveToListModal
          isOpen={isMoveModalOpen}
          onClose={() => setIsMoveModalOpen(false)}
          selectedItems={Array.from(selectedItems)
            .map((id) => {
              const found = filteredAndSorted.find(
                ({ listItem }) => listItem.id === id
              );
              return found
                ? {
                    id: found.listItem.id,
                    tmdbId: found.listItem.tmdbId,
                    mediaType: found.listItem.mediaType,
                    title: found.listItem.title,
                    posterPath: found.listItem.posterPath,
                    backdropPath: found.listItem.backdropPath,
                    releaseDate: found.listItem.releaseDate,
                    firstAirDate: found.listItem.firstAirDate,
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
          }>}
          currentListId={list.id}
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
  currentListId: string;
  onSuccess: () => void;
}

function CopyToListModal({
  isOpen,
  onClose,
  selectedItems,
  currentListId,
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

  // Filter out current list from available lists
  const availableLists = lists.filter((l) => l.id !== currentListId);

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
                {availableLists.map((list) => (
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
  currentListId: string;
  onRemove?: (itemId: string) => Promise<void>;
  onSuccess: () => void;
}

function MoveToListModal({
  isOpen,
  onClose,
  selectedItems,
  currentListId,
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

        // Remove from current list
        if (onRemove) {
          for (const item of selectedItems) {
            await onRemove(item.id);
          }
        }

        toast.success(
          `Created new list and moved ${selectedItems.length} item${
            selectedItems.length > 1 ? "s" : ""
          }`
        );
      } else if (selectedListId) {
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

        // Remove from current list
        if (onRemove) {
          for (const item of selectedItems) {
            await onRemove(item.id);
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

  // Filter out current list from available lists
  const availableLists = lists.filter((l) => l.id !== currentListId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to List</DialogTitle>
          <DialogDescription>
            Move {selectedItems.length} item
            {selectedItems.length > 1 ? "s" : ""} to a list (items will be
            removed from current list)
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
                {availableLists.map((list) => (
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
            disabled={isRemoving}
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

// Detailed List Item Component (simplified version - can be expanded later)
interface DetailedListItemProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  listItem: ListItem;
  listId: string;
  isEditMode: boolean;
  isSelected: boolean;
  position?: number;
  index: number;
  totalItems: number;
  onSelect: () => void;
  onRemove?: () => void;
  onItemClick: () => void;
  isLgScreen: boolean;
  sortField: SortField;
}

function DetailedListItem({
  item,
  type,
  listItem,
  listId,
  isEditMode,
  isSelected,
  position,
  index,
  totalItems,
  onSelect,
  onRemove,
  onItemClick,
  isLgScreen,
  sortField,
}: DetailedListItemProps) {
  const router = useRouter();
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const updateList = useUpdateList();
  const { data: currentList } = useList(listId);

  const formattedAddedDate = format(new Date(listItem.createdAt), "MMM d, yyyy");

  const handlePositionChange = async (newPosition: number) => {
    if (!currentList) return;
    
    try {
      // Get all items and reorder them
      const allItems = [...currentList.items];
      const currentIndex = allItems.findIndex((i) => i.id === listItem.id);
      
      if (currentIndex === -1) return;
      
      // Remove item from current position
      const [movedItem] = allItems.splice(currentIndex, 1);
      
      // Insert at new position (adjust for 0-based index)
      const newIndex = newPosition - 1;
      allItems.splice(newIndex, 0, movedItem);
      
      // Reassign positions sequentially
      const reorderedItems = allItems.map((item, idx) => ({
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        posterPath: item.posterPath,
        backdropPath: item.backdropPath,
        releaseDate: item.releaseDate,
        firstAirDate: item.firstAirDate,
        position: idx + 1,
      }));

      await updateList.mutateAsync({
        listId,
        items: reorderedItems,
      });
      
      toast.success("Position updated");
    } catch (error) {
      toast.error("Failed to update position");
      console.error(error);
    }
  };

  return (
    <div
      className={cn(
        "relative flex gap-4 p-4 rounded-lg border border-border bg-card transition-all group",
        isEditMode && isSelected && "bg-primary/10 border-primary",
        !isEditMode && "cursor-pointer hover:border-primary/50"
      )}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, a, input, select, textarea')) {
          return;
        }
        onItemClick();
      }}
    >
      {isEditMode && isLgScreen && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {sortField === "listOrder" && (
            <div className="text-muted-foreground">
              <GripVertical className="h-5 w-5" />
            </div>
          )}
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

      {/* Poster */}
      {listItem.posterPath ? (
        <div className="relative w-20 h-28 sm:w-24 sm:h-36 rounded overflow-hidden flex-shrink-0 bg-muted">
          <Image
            src={getPosterUrl(listItem.posterPath)}
            alt={listItem.title}
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

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {position !== undefined && (
            <span className="text-sm text-muted-foreground">
              {position}.
            </span>
          )}
          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
            {listItem.title}
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
                    setIsPositionModalOpen(true);
                  }}
                >
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  Change Position
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <span className="capitalize">{type}</span>
          {listItem.releaseDate && (
            <>
              <span>•</span>
              <span>
                {new Date(listItem.releaseDate).getFullYear()}
              </span>
            </>
          )}
        </div>

        {isEditMode && !isLgScreen && (
          <div className="flex items-center gap-2">
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
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {!isEditMode && onRemove && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        )}
      </div>

      {isPositionModalOpen && position !== undefined && (
        <ChangePositionModal
          open={isPositionModalOpen}
          onOpenChange={setIsPositionModalOpen}
          currentPosition={position}
          maxPosition={totalItems}
          title={listItem.title}
          onConfirm={handlePositionChange}
        />
      )}
    </div>
  );
}

