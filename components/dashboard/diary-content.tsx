"use client";

import { useState, useMemo, useEffect } from "react";
import { useViewingLogs, useDeleteViewingLog, useUpdateViewingLog, type ViewingLog } from "@/hooks/use-viewing-logs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Trash2, Film, Tv, Edit, Table2, Grid3x3, CalendarIcon, Heart, Star, FileText, X, Filter, ChevronLeft, ChevronRight, Bookmark, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import Image from "next/image";
import { getPosterUrl, TMDBMovie, TMDBSeries } from "@/lib/tmdb";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FilterSearchBar, FilterRow } from "@/components/ui/filter-search-bar";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToggleFavorite, useAddFavorite, useRemoveFavorite } from "@/hooks/use-favorites";
import { useToggleWatchlist } from "@/hooks/use-watchlist";

type SortField = "watchedAt" | "rating" | "title" | "releaseYear";
type SortOrder = "asc" | "desc";

export default function DiaryContent() {
  const { data: logs = [], isLoading } = useViewingLogs();
  const deleteLog = useDeleteViewingLog();
  const updateLog = useUpdateViewingLog();
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const toggleFavorite = useToggleFavorite();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<ViewingLog | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [logToEdit, setLogToEdit] = useState<ViewingLog | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [hasMounted, setHasMounted] = useState(false);
  
  // Pagination state
  const [rowsToShow, setRowsToShow] = useState(10); // Number of date rows to show
  const [tableCurrentPage, setTableCurrentPage] = useState(1);
  const tablePageSize = 25;
  
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "movie" | "tv">("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [likedFilter, setLikedFilter] = useState<"all" | "liked" | "not-liked">("all");
  const [watchedYearFilter, setWatchedYearFilter] = useState<string>("all");
  const [isFilterRowOpen, setIsFilterRowOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<SortField>("watchedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Get unique values for filters
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    logs.forEach((log) => {
      const year = log.releaseDate 
        ? new Date(log.releaseDate).getFullYear() 
        : log.firstAirDate 
        ? new Date(log.firstAirDate).getFullYear() 
        : null;
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [logs]);

  const availableWatchedYears = useMemo(() => {
    const years = new Set<number>();
    logs.forEach((log) => {
      const year = new Date(log.watchedAt).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [logs]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    logs.forEach((log) => {
      (log.tags || []).forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [logs]);

  // Filter and sort logs
  const filteredAndSortedLogs = useMemo(() => {
    let filtered = [...logs];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((log) =>
        log.title.toLowerCase().includes(query) ||
        (log.notes && log.notes.toLowerCase().includes(query))
      );
    }

    // Media type filter
    if (mediaTypeFilter !== "all") {
      filtered = filtered.filter((log) => log.mediaType === mediaTypeFilter);
    }

    // Year filter (release year)
    if (yearFilter !== "all") {
      const year = parseInt(yearFilter, 10);
      filtered = filtered.filter((log) => {
        const releaseYear = log.releaseDate 
          ? new Date(log.releaseDate).getFullYear() 
          : log.firstAirDate 
          ? new Date(log.firstAirDate).getFullYear() 
          : null;
        return releaseYear === year;
      });
    }

    // Rating filter
    if (ratingFilter !== "all") {
      const rating = parseInt(ratingFilter, 10);
      filtered = filtered.filter((log) => log.rating === rating);
    }

    // Tag filter
    if (tagFilter && tagFilter !== "all") {
      const tag = tagFilter.toLowerCase().trim();
      filtered = filtered.filter((log) =>
        (log.tags || []).some((t) => t.toLowerCase() === tag)
      );
    }

    // Liked filter
    if (likedFilter !== "all") {
      filtered = filtered.filter((log) => {
        const isLiked = toggleFavorite.isFavorite(log.tmdbId, log.mediaType);
        return likedFilter === "liked" ? isLiked : !isLiked;
      });
    }

    // Watched year filter
    if (watchedYearFilter !== "all") {
      const year = parseInt(watchedYearFilter, 10);
      filtered = filtered.filter((log) => {
        const watchedYear = new Date(log.watchedAt).getFullYear();
        return watchedYear === year;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number | null;
      let bValue: string | number | null;

      switch (sortField) {
        case "watchedAt":
          aValue = new Date(a.watchedAt).getTime();
          bValue = new Date(b.watchedAt).getTime();
          break;
        case "rating":
          aValue = a.rating ?? 0;
          bValue = b.rating ?? 0;
          break;
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "releaseYear":
          aValue = a.releaseDate 
            ? new Date(a.releaseDate).getFullYear() 
            : a.firstAirDate 
            ? new Date(a.firstAirDate).getFullYear() 
            : 0;
          bValue = b.releaseDate 
            ? new Date(b.releaseDate).getFullYear() 
            : b.firstAirDate 
            ? new Date(b.firstAirDate).getFullYear() 
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
  }, [logs, searchQuery, mediaTypeFilter, yearFilter, ratingFilter, tagFilter, likedFilter, watchedYearFilter, sortField, sortOrder, toggleFavorite]);

  // Group filtered logs by date (for grid view)
  const groupedLogs = useMemo(() => {
    const groups: Record<string, ViewingLog[]> = {};
    filteredAndSortedLogs.forEach((log) => {
      const dateKey = format(new Date(log.watchedAt), "yyyy-MM-dd");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    });
    return groups;
  }, [filteredAndSortedLogs]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));
  }, [groupedLogs]);

  // Paginated data for grid view
  const paginatedGridData = useMemo(() => {
    // Show up to rowsToShow number of date rows (not cards)
    const visibleDates: Array<{ dateKey: string; logsToShow: number }> = [];
    
    for (let i = 0; i < Math.min(rowsToShow, sortedDates.length); i++) {
      const dateKey = sortedDates[i];
      const dateLogs = groupedLogs[dateKey];
      // Show all logs for each visible date row
      visibleDates.push({ dateKey, logsToShow: dateLogs.length });
    }
    
    const totalRows = sortedDates.length;
    const hasMore = rowsToShow < totalRows;
    
    return { visibleDates, hasMore };
  }, [sortedDates, groupedLogs, rowsToShow]);

  // Paginated data for table view
  const paginatedTableData = useMemo(() => {
    const startIndex = (tableCurrentPage - 1) * tablePageSize;
    const endIndex = startIndex + tablePageSize;
    const paginatedLogs = filteredAndSortedLogs.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredAndSortedLogs.length / tablePageSize);
    
    return { paginatedLogs, totalPages };
  }, [filteredAndSortedLogs, tableCurrentPage, tablePageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortOrder === "asc" 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setMediaTypeFilter("all");
    setYearFilter("all");
    setRatingFilter("all");
    setTagFilter("");
    setLikedFilter("all");
    setWatchedYearFilter("all");
    // Reset pagination when filters change
    setRowsToShow(10);
    setTableCurrentPage(1);
  };

  // Reset pagination when filters or sort change
  useEffect(() => {
    setRowsToShow(10);
    setTableCurrentPage(1);
  }, [searchQuery, mediaTypeFilter, yearFilter, ratingFilter, tagFilter, likedFilter, watchedYearFilter, sortField, sortOrder]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (mediaTypeFilter !== "all") count++;
    if (yearFilter !== "all") count++;
    if (ratingFilter !== "all") count++;
    if (tagFilter && tagFilter !== "all") count++;
    if (likedFilter !== "all") count++;
    if (watchedYearFilter !== "all") count++;
    return count;
  }, [searchQuery, mediaTypeFilter, yearFilter, ratingFilter, tagFilter, likedFilter, watchedYearFilter]);

  const handleDeleteClick = (log: ViewingLog) => {
    setLogToDelete(log);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!logToDelete) return;
    try {
      await deleteLog.mutateAsync(logToDelete.id);
      toast.success("Entry deleted from diary");
      setDeleteDialogOpen(false);
      setLogToDelete(null);
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  const handleLogClick = (log: ViewingLog, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (currentUser?.username) {
      // Create URL-friendly film title slug
      const filmTitleSlug = log.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      router.push(`/${currentUser.username}/film/${filmTitleSlug}?tmdbId=${log.tmdbId}&mediaType=${log.mediaType}&logId=${log.id}`);
    }
  };

  const handleEditClick = (log: ViewingLog, e: React.MouseEvent) => {
    e.stopPropagation();
    setLogToEdit(log);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (watchedDate: Date, notes: string, rating: number | null, tags: string[]) => {
    if (!logToEdit) return;
    try {
      await updateLog.mutateAsync({
        logId: logToEdit.id,
        watchedAt: watchedDate.toISOString(),
        notes: notes.trim() || null,
        rating: rating || null,
        tags: tags,
      });
      
      toast.success("Entry updated");
      setEditDialogOpen(false);
      setLogToEdit(null);
    } catch {
      toast.error("Failed to update entry");
    }
  };

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const renderLoadingState = () => (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Skeleton className="h-10 w-48 mb-8" />
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );

  if (!hasMounted) {
    return renderLoadingState();
  }

  if (isLoading) {
    return renderLoadingState();
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header - Full width */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Film Diary</h1>
        <p className="text-muted-foreground">
          {filteredAndSortedLogs.length} of {logs.length} {logs.length === 1 ? "entry" : "entries"}
          {activeFilterCount > 0 && (
            <span className="ml-2">
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"} active
              </Badge>
            </span>
          )}
        </p>
      </div>

      {/* View Toggle Buttons and Search/Filter/Sort - Wrapper */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-5">
        {/* View Mode Buttons */}
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

        {/* Search, Filter, and Sort */}
        <div className="flex-1 sm:flex-initial">
          <FilterSearchBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search by title or notes..."
            searchMaxWidth="sm:max-w-[25rem]"
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
          filters={[
            {
              label: "Type",
              value: mediaTypeFilter,
              options: [
                { value: "all", label: "All Types" },
                { value: "movie", label: "Movies", icon: <Film className="h-4 w-4" /> },
                { value: "tv", label: "TV Shows", icon: <Tv className="h-4 w-4" /> },
              ],
              onValueChange: (value) => setMediaTypeFilter(value as "all" | "movie" | "tv"),
            },
            {
              label: "Release Year",
              value: yearFilter,
              options: [
                { value: "all", label: "All Years" },
                ...availableYears.map((year) => ({
                  value: year.toString(),
                  label: year.toString(),
                })),
              ],
              onValueChange: setYearFilter,
            },
            {
              label: "Watched Year",
              value: watchedYearFilter,
              options: [
                { value: "all", label: "All Watched" },
                ...availableWatchedYears.map((year) => ({
                  value: year.toString(),
                  label: year.toString(),
                })),
              ],
              onValueChange: setWatchedYearFilter,
            },
            {
              label: "Rating",
              value: ratingFilter,
              options: [
                { value: "all", label: "All Ratings" },
                ...([5, 4, 3, 2, 1].map((rating) => ({
                  value: rating.toString(),
                  label: `${rating} ${rating === 1 ? "star" : "stars"}`,
                  icon: <Star className="h-4 w-4" />,
                }))),
              ],
              onValueChange: setRatingFilter,
            },
            ...(availableTags.length > 0
              ? [
                  {
                    label: "Tag",
                    value: tagFilter,
                    options: [
                      { value: "all", label: "All Tags" },
                      ...availableTags.map((tag) => ({
                        value: tag,
                        label: tag,
                      })),
                    ],
                    onValueChange: setTagFilter,
                  },
                ]
              : []),
            {
              label: "Liked",
              value: likedFilter,
              options: [
                { value: "all", label: "All" },
                { value: "liked", label: "Liked", icon: <Heart className="h-4 w-4" /> },
                { value: "not-liked", label: "Not Liked" },
              ],
              onValueChange: (value) => setLikedFilter(value as "all" | "liked" | "not-liked"),
            },
            {
              label: "Sort By",
              value: `${sortField}-${sortOrder}`,
              options: [
                { value: "watchedAt-desc", label: "Date Watched (Newest)" },
                { value: "watchedAt-asc", label: "Date Watched (Oldest)" },
                { value: "rating-desc", label: "Rating (High to Low)" },
                { value: "rating-asc", label: "Rating (Low to High)" },
                { value: "title-asc", label: "Title (A-Z)" },
                { value: "title-desc", label: "Title (Z-A)" },
                { value: "releaseYear-desc", label: "Release Year (Newest)" },
                { value: "releaseYear-asc", label: "Release Year (Oldest)" },
              ],
              onValueChange: (value) => {
                const [field, order] = value.split("-");
                setSortField(field as SortField);
                setSortOrder(order as SortOrder);
              },
            },
          ]}
            hasActiveFilters={activeFilterCount > 0}
            onClearAll={clearFilters}
            renderFilterRowOutside={true}
            onFilterRowStateChange={setIsFilterRowOpen}
          />
        </div>
      </div>

      {/* Filter Row - Rendered outside under main wrapper */}
      <FilterRow
        filters={[
          {
            label: "Type",
            value: mediaTypeFilter,
            options: [
              { value: "all", label: "All Types" },
              { value: "movie", label: "Movies", icon: <Film className="h-4 w-4" /> },
              { value: "tv", label: "TV Shows", icon: <Tv className="h-4 w-4" /> },
            ],
            onValueChange: (value) => setMediaTypeFilter(value as "all" | "movie" | "tv"),
          },
          {
            label: "Release Year",
            value: yearFilter,
            options: [
              { value: "all", label: "All Years" },
              ...availableYears.map((year) => ({
                value: year.toString(),
                label: year.toString(),
              })),
            ],
            onValueChange: setYearFilter,
          },
          {
            label: "Watched Year",
            value: watchedYearFilter,
            options: [
              { value: "all", label: "All Watched" },
              ...availableWatchedYears.map((year) => ({
                value: year.toString(),
                label: year.toString(),
              })),
            ],
            onValueChange: setWatchedYearFilter,
          },
          {
            label: "Rating",
            value: ratingFilter,
            options: [
              { value: "all", label: "All Ratings" },
              ...([5, 4, 3, 2, 1].map((rating) => ({
                value: rating.toString(),
                label: `${rating} ${rating === 1 ? "star" : "stars"}`,
                icon: <Star className="h-4 w-4" />,
              }))),
            ],
            onValueChange: setRatingFilter,
          },
          ...(availableTags.length > 0
            ? [
                {
                  label: "Tag",
                  value: tagFilter,
                  options: [
                    { value: "all", label: "All Tags" },
                    ...availableTags.map((tag) => ({
                      value: tag,
                      label: tag,
                    })),
                  ],
                  onValueChange: setTagFilter,
                },
              ]
            : []),
          {
            label: "Liked",
            value: likedFilter,
            options: [
              { value: "all", label: "All" },
              { value: "liked", label: "Liked", icon: <Heart className="h-4 w-4" /> },
              { value: "not-liked", label: "Not Liked" },
            ],
            onValueChange: (value) => setLikedFilter(value as "all" | "liked" | "not-liked"),
          },
          {
            label: "Sort By",
            value: `${sortField}-${sortOrder}`,
            options: [
              { value: "watchedAt-desc", label: "Date Watched (Newest)" },
              { value: "watchedAt-asc", label: "Date Watched (Oldest)" },
              { value: "rating-desc", label: "Rating (High to Low)" },
              { value: "rating-asc", label: "Rating (Low to High)" },
              { value: "title-asc", label: "Title (A-Z)" },
              { value: "title-desc", label: "Title (Z-A)" },
              { value: "releaseYear-desc", label: "Release Year (Newest)" },
              { value: "releaseYear-asc", label: "Release Year (Oldest)" },
            ],
            onValueChange: (value) => {
              const [field, order] = value.split("-");
              setSortField(field as SortField);
              setSortOrder(order as SortOrder);
            },
          },
        ]}
        openDropdowns={openDropdowns}
        setOpenDropdowns={setOpenDropdowns}
        toggleDropdown={(label) => {
          setOpenDropdowns((prev) => ({
            ...prev,
            [label]: !prev[label],
          }));
        }}
        getFilterDisplayValue={(filter) => {
          const option = filter.options.find((opt) => opt.value === filter.value);
          return option?.label || filter.value;
        }}
        handleFilterValueChange={(label, value, onValueChange) => {
          onValueChange(value);
          setOpenDropdowns((prev) => ({
            ...prev,
            [label]: false,
          }));
        }}
        onClearAll={clearFilters}
        hasActiveFilters={activeFilterCount > 0}
        isOpen={isFilterRowOpen}
      />

      {filteredAndSortedLogs.length === 0 && logs.length > 0 ? (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No entries match your filters</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your filters to see more results.
          </p>
          <Button variant="outline" onClick={clearFilters} className="cursor-pointer">
            Clear All Filters
          </Button>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12">
          <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Your diary is empty</h3>
          <p className="text-muted-foreground">
            Start logging films you&apos;ve watched to build your viewing history.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <>
          <div className="space-y-12">
            {paginatedGridData.visibleDates.map(({ dateKey, logsToShow: logsCount }) => {
              const dateLogs = groupedLogs[dateKey];
              const date = new Date(dateKey);
              const formattedDate = format(date, "MMM d, yyyy");
              const dayName = format(date, "EEEE");
              
              // Get the logs to show for this date
              const logsToShow = dateLogs.slice(0, logsCount);

              return (
                <div key={dateKey} className="relative">
                  {/* Timeline line - horizontal line connecting all dates */}
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
                  
                  {/* Date header with calendar icon */}
                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-background border-2 border-primary/20 flex-shrink-0">
                      <CalendarIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{dayName}</h2>
                      <p className="text-sm text-muted-foreground">{formattedDate}</p>
                    </div>
                  </div>

                  {/* Horizontal card row with carousel - cards hang from the date */}
                  <div className="ml-20 md:ml-24 relative">
                    <Carousel
                      opts={{
                        align: "start",
                        slidesToScroll: 1,
                      }}
                      className="w-full"
                    >
                      {/* Carousel controls positioned at top right */}
                      <div className="absolute -top-12 right-0 z-10 flex items-center gap-2">
                        <CarouselPrevious 
                          className="relative top-0 left-0 right-0 translate-x-0 translate-y-0 h-8 w-8" 
                          variant="outline"
                        />
                        <CarouselNext 
                          className="relative top-0 left-0 right-0 translate-x-0 translate-y-0 h-8 w-8" 
                          variant="outline"
                        />
                      </div>
                      <CarouselContent className="-ml-2 md:-ml-4">
                        {logsToShow.map((log) => (
                          <CarouselItem key={log.id} className="pl-2 md:pl-4 basis-[160px]">
                            <div
                              className="group relative bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                              onClick={() => handleLogClick(log)}
                            >
                              {/* Connection line from date to card */}
                              <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-0.5 bg-border" />
                              
                              <div className="relative aspect-[2/3] bg-muted rounded-lg overflow-hidden">
                                {log.posterPath ? (
                                  <Image
                                    src={getPosterUrl(log.posterPath)}
                                    alt={log.title}
                                    fill
                                    className="object-cover"
                                    sizes="160px"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    {log.mediaType === "movie" ? (
                                      <Film className="h-8 w-8 text-muted-foreground" />
                                    ) : (
                                      <Tv className="h-8 w-8 text-muted-foreground" />
                                    )}
                                  </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-1">
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80"
                                    onClick={(e) => handleEditClick(log, e)}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick(log);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              <div className="p-2">
                                <div className="flex items-start justify-between gap-1 mb-1">
                                  <h3 className="font-semibold text-xs line-clamp-1 flex-1">{log.title}</h3>
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    {log.mediaType === "movie" ? (
                                      <Film className="h-3 w-3" />
                                    ) : (
                                      <Tv className="h-3 w-3" />
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <CalendarIcon className="h-3 w-3" />
                                  <span>{format(new Date(log.watchedAt), "h:mm a")}</span>
                                </div>
                                {log.notes && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{log.notes}</p>
                                )}
                              </div>
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                    </Carousel>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Load More Button */}
          {paginatedGridData.hasMore && (
            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                onClick={() => setRowsToShow(prev => prev + 10)}
                className="cursor-pointer"
              >
                Load More
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th 
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("title")}
                  >
                    <div className="flex items-center">
                      Film
                      {getSortIcon("title")}
                    </div>
                  </th>
                  <th 
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("watchedAt")}
                  >
                    <div className="flex items-center">
                      Month
                      {getSortIcon("watchedAt")}
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Day
                  </th>
                  <th 
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("releaseYear")}
                  >
                    <div className="flex items-center">
                      Year Released
                      {getSortIcon("releaseYear")}
                    </div>
                  </th>
                  <th 
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("rating")}
                  >
                    <div className="flex items-center">
                      Rating
                      {getSortIcon("rating")}
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Like
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Note
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedTableData.paginatedLogs.map((log) => {
                  const watchedDate = new Date(log.watchedAt);
                  const releaseYear = log.releaseDate 
                    ? new Date(log.releaseDate).getFullYear() 
                    : log.firstAirDate 
                    ? new Date(log.firstAirDate).getFullYear() 
                    : "—";
                  const isLiked = toggleFavorite.isFavorite(log.tmdbId, log.mediaType);
                  
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {log.posterPath ? (
                            <div 
                              className="relative w-16 h-24 rounded overflow-hidden flex-shrink-0 bg-muted cursor-pointer"
                              onClick={(e) => handleLogClick(log, e)}
                            >
                              <Image
                                src={getPosterUrl(log.posterPath)}
                                alt={log.title}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-24 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                              {log.mediaType === "movie" ? (
                                <Film className="h-6 w-6 text-muted-foreground" />
                              ) : (
                                <Tv className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={(e) => handleLogClick(log, e)}
                          >
                            <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                              {log.title}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {format(watchedDate, "MMM yyyy")}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-muted-foreground">
                          {format(watchedDate, "d")}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-muted-foreground">
                          {releaseYear}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {log.rating ? (
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  "h-4 w-4",
                                  star <= log.rating!
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-muted-foreground"
                                )}
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Heart
                          className={cn(
                            "h-4 w-4",
                            isLiked
                              ? "text-red-500 fill-red-500"
                              : "text-muted-foreground"
                          )}
                        />
                      </td>
                      <td className="px-4 py-4">
                        {log.notes ? (
                          <FileText 
                            className="h-4 w-4 text-primary cursor-pointer"
                            onClick={(e) => handleLogClick(log, e)}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleEditClick(log, e)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(log);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Table Pagination */}
          {paginatedTableData.totalPages > 1 && (
            <div className="flex flex-col gap-3 px-4 py-3 border-t border-border md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(tableCurrentPage - 1) * tablePageSize + 1} to {Math.min(tableCurrentPage * tablePageSize, filteredAndSortedLogs.length)} of {filteredAndSortedLogs.length} entries
              </div>
              <div className="flex items-center gap-2 w-full overflow-auto md:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTableCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={tableCurrentPage === 1}
                  className="cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1 overflow-auto">
                  {Array.from({ length: paginatedTableData.totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first page, last page, current page, and pages around current
                      return page === 1 || 
                             page === paginatedTableData.totalPages || 
                             (page >= tableCurrentPage - 1 && page <= tableCurrentPage + 1);
                    })
                    .map((page, index, array) => {
                      // Add ellipsis if there's a gap
                      const showEllipsisBefore = index > 0 && array[index - 1] < page - 1;
                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsisBefore && <span className="text-muted-foreground px-2">...</span>}
                          <Button
                            variant={tableCurrentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTableCurrentPage(page)}
                            className="cursor-pointer min-w-[2.5rem]"
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTableCurrentPage(prev => Math.min(paginatedTableData.totalPages, prev + 1))}
                  disabled={tableCurrentPage === paginatedTableData.totalPages}
                  className="cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &quot;{logToDelete?.title}&quot; from your diary? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteLog.isPending}>
              {deleteLog.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {logToEdit && (
        <EditLogDialog
          isOpen={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setLogToEdit(null);
          }}
          log={logToEdit}
          onSubmit={handleEditSubmit}
          isPending={updateLog.isPending}
        />
      )}
    </div>
  );
}

// Edit Log Dialog Component
interface EditLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  log: ViewingLog;
  onSubmit: (watchedDate: Date, notes: string, rating: number | null, tags: string[]) => void;
  isPending: boolean;
}

function EditLogDialog({ isOpen, onClose, log, onSubmit, isPending }: EditLogDialogProps) {
  const [watchedDate, setWatchedDate] = useState<Date>(new Date(log.watchedAt));
  const [notes, setNotes] = useState(log.notes || "");
  const [rating, setRating] = useState<number | null>(log.rating || null);
  const [tags, setTags] = useState((log.tags || []).join(", "));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const toggleFavorite = useToggleFavorite();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const toggleWatchlist = useToggleWatchlist();
  const isLiked = toggleFavorite.isFavorite(log.tmdbId, log.mediaType);
  const isInWatchlist = toggleWatchlist.isInWatchlist(log.tmdbId, log.mediaType);

  // Create mock item for toggleWatchlist
  const mockItem: TMDBMovie | TMDBSeries = log.mediaType === "movie"
    ? {
        id: log.tmdbId,
        title: log.title,
        poster_path: log.posterPath || "",
        backdrop_path: log.backdropPath || "",
        release_date: log.releaseDate || "",
        overview: "",
        vote_average: 0,
        vote_count: 0,
        genre_ids: [],
        popularity: 0,
        adult: false,
        original_language: "en",
        original_title: log.title,
      }
    : {
        id: log.tmdbId,
        name: log.title,
        poster_path: log.posterPath || "",
        backdrop_path: log.backdropPath || "",
        first_air_date: log.firstAirDate || "",
        overview: "",
        vote_average: 0,
        vote_count: 0,
        genre_ids: [],
        popularity: 0,
        original_language: "en",
        original_name: log.title,
      };

  // Reset form when log changes
  useEffect(() => {
    if (isOpen && log) {
      setWatchedDate(new Date(log.watchedAt));
      setNotes(log.notes || "");
      setRating(log.rating || null);
      setTags((log.tags || []).join(", "));
    }
  }, [isOpen, log]);

  const handleLikeToggle = async () => {
    if (isLiked) {
      await removeFavorite.mutateAsync({ tmdbId: log.tmdbId, mediaType: log.mediaType });
    } else {
      await addFavorite.mutateAsync({
        tmdbId: log.tmdbId,
        mediaType: log.mediaType,
        title: log.title,
        posterPath: log.posterPath ?? undefined,
        backdropPath: log.backdropPath ?? undefined,
        releaseDate: log.releaseDate || undefined,
        firstAirDate: log.firstAirDate || undefined,
      });
    }
  };

  const handleSubmit = () => {
    const tagsArray = tags.trim() ? tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
    onSubmit(watchedDate, notes, rating, tagsArray);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] h-auto overflow-hidden p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="sticky top-0 z-10 bg-background px-6 pt-6 pb-4 border-b">
          <DialogTitle>Edit Entry</DialogTitle>
          <DialogDescription>
            Update when you watched &quot;{log.title}&quot; and your notes.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 min-h-0">
          <div className="space-y-4">
          {/* Favorite and Watchlist Buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                isLiked && "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
              )}
              onClick={handleLikeToggle}
            >
              <Heart 
                className={cn(
                  "h-4 w-4",
                  isLiked 
                    ? "text-red-500 fill-red-500" 
                    : "text-muted-foreground"
                )} 
              />
              <span className="text-sm">
                {isLiked ? "Favorited" : "Favorite"}
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                isInWatchlist && "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
              )}
              onClick={async () => {
                await toggleWatchlist.toggle(mockItem, log.mediaType);
              }}
            >
              <Bookmark 
                className={cn(
                  "h-4 w-4",
                  isInWatchlist 
                    ? "text-blue-500 fill-blue-500" 
                    : "text-muted-foreground"
                )} 
              />
              <span className="text-sm">
                {isInWatchlist ? "In Watchlist" : "Watchlist"}
              </span>
            </Button>
          </div>
          
          {/* Star Rating */}
          <div className="space-y-2">
            <Label className="text-sm">Rating (Optional)</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? null : star)}
                  className="focus:outline-none cursor-pointer"
                >
                  <Star
                    className={cn(
                      "h-5 w-5 transition-colors",
                      rating && star <= rating
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-muted-foreground"
                    )}
                  />
                </button>
              ))}
              {rating && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating}/5
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="watched-date">Date Watched</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal cursor-pointer",
                    !watchedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchedDate ? format(watchedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watchedDate}
                  onSelect={(date) => {
                    if (date) {
                      setWatchedDate(date);
                      setIsCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add your thoughts, rating, or any notes about this viewing..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (Optional)</Label>
            <Input
              id="tags"
              placeholder="Add tags separated by commas (e.g., Netflix, horror, favorite)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple tags with commas
            </p>
          </div>
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 z-10 bg-background border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="cursor-pointer">
            {isPending ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

