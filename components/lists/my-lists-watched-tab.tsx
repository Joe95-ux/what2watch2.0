"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useWatchedTitles } from "@/hooks/use-viewing-logs";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { MoreLikeThisCardSkeleton } from "@/components/skeletons/more-like-this-card-skeleton";
import { getPosterUrl, TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Eye, CalendarIcon, Film, Tv } from "lucide-react";
import { SimplePagination as Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { endOfWeek, format, startOfWeek } from "date-fns";
import { FilterRow, FilterSearchBar } from "@/components/ui/filter-search-bar";

const ITEMS_PER_PAGE = 24;

type ViewMode = "grid" | "timeline";
type TimelineLayout = "row-list" | "carousel";
type SortField = "watchedAt" | "title" | "releaseYear";
type Grouping = "day" | "week" | "month";

function extractTvWatchProgressLabel(title: string): string | null {
  const normalized = title.trim();
  if (!normalized) return null;

  const seasonEpisodeRange = normalized.match(/\bS\d+E\d+(?:\s*[-–]\s*E?\d+)?\b/i);
  if (seasonEpisodeRange?.[0]) return seasonEpisodeRange[0].replace(/\s+/g, "");

  const seasonRange = normalized.match(/\bSeason\s+\d+(?:\s*[-–]\s*Season\s+\d+)?\b/i);
  if (seasonRange?.[0]) return seasonRange[0];

  return null;
}

const titlePageHref = (mediaType: "movie" | "tv", tmdbId: number, title: string) => {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return `/${mediaType}/${tmdbId}/${slug || "title"}`;
};

const cleanupTitleSlugSource = (value: string) =>
  value
    .replace(/[-\s]+s\d+(?:[-\s]+s\d+)*$/i, "")
    .replace(/\s+season\s+\d+(?:\s*[-–]\s*season\s+\d+)?$/i, "")
    .trim();

// Convert viewing log to TMDB format
function logToTMDB(log: any): TMDBMovie | TMDBSeries {
  if (log.mediaType === "movie") {
    return {
      id: log.tmdbId,
      title: log.title,
      poster_path: log.posterPath,
      backdrop_path: log.backdropPath,
      release_date: log.releaseDate || undefined,
      vote_average: 0,
      overview: "",
    } as TMDBMovie;
  } else {
    return {
      id: log.tmdbId,
      name: log.title,
      poster_path: log.posterPath,
      backdrop_path: log.backdropPath,
      first_air_date: log.firstAirDate || undefined,
      vote_average: 0,
      overview: "",
    } as TMDBSeries;
  }
}

async function fetchTMDBDetails(tmdbId: number, mediaType: "movie" | "tv") {
  try {
    const response = await fetch(`/api/tmdb/${mediaType}/${tmdbId}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export default function MyListsWatchedTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: watchedTitles = [], isLoading } = useWatchedTitles();
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const view = searchParams.get("view");
    return view === "timeline" ? "timeline" : "grid";
  });
  const [timelineLayout, setTimelineLayout] = useState<TimelineLayout>("row-list");
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "movie" | "tv">("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [watchedYearFilter, setWatchedYearFilter] = useState<string>("all");
  const [grouping, setGrouping] = useState<Grouping>("day");
  const [sortField, setSortField] = useState<SortField>("watchedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFilterRowOpen, setIsFilterRowOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

  const applyWatchedQueryState = (next: { view?: ViewMode }) => {
    const params = new URLSearchParams(searchParams.toString());
    const effectiveView = next.view ?? viewMode;
    if (effectiveView === "grid") {
      params.delete("view");
    } else {
      params.set("view", "timeline");
    }
    const current = searchParams.toString();
    const nextQuery = params.toString();
    if (current === nextQuery) return;
    router.push(nextQuery ? `/lists?${nextQuery}` : "/lists");
  };

  // Sync with URL changes (browser back/forward)
  useEffect(() => {
    const view = searchParams.get("view");
    setViewMode(view === "timeline" ? "timeline" : "grid");
  }, [searchParams]);

  // Convert watched titles to base TMDB format.
  const uniqueItems = useMemo(() => {
    const sortedTitles = [...watchedTitles].sort(
      (a, b) => new Date(b.seenAt).getTime() - new Date(a.seenAt).getTime()
    );
    return sortedTitles.map((entry) => ({
      baseItem: logToTMDB({
        tmdbId: entry.tmdbId,
        mediaType: entry.mediaType,
        title: cleanupTitleSlugSource(entry.title),
        posterPath: entry.posterPath,
        backdropPath: entry.backdropPath,
        releaseDate: null,
        firstAirDate: null,
      }),
      type: entry.mediaType as "movie" | "tv",
      watched: entry,
    }));
  }, [watchedTitles]);

  const detailTargets = useMemo(() => {
    const targetKeys = new Set<string>();

    uniqueItems.forEach((entry) => targetKeys.add(`${entry.type}-${entry.watched.tmdbId}`));

    return Array.from(targetKeys).map((key) => {
      const [type, tmdbIdRaw] = key.split("-");
      return { key, type: type as "movie" | "tv", tmdbId: Number(tmdbIdRaw) };
    });
  }, [uniqueItems]);

  const { data: details = [], isLoading: isLoadingDetails } = useQuery({
    queryKey: [
      "watched-content-details",
      detailTargets.map((entry) => entry.key),
    ],
    queryFn: async () => {
      const results = await Promise.all(
        detailTargets.map(async (entry) => {
          const detail = await fetchTMDBDetails(entry.tmdbId, entry.type);
          return {
            key: entry.key,
            detail,
          };
        })
      );
      return results;
    },
    enabled: detailTargets.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const detailsMap = useMemo(() => {
    const map = new Map<string, TMDBMovie | TMDBSeries>();
    for (const row of details) {
      if (row.detail) {
        map.set(row.key, row.detail as TMDBMovie | TMDBSeries);
      }
    }
    return map;
  }, [details]);

  const itemsWithCanonicalTitles = useMemo(() => {
    return uniqueItems.map((entry) => {
      const key = `${entry.type}-${entry.watched.tmdbId}`;
      const detail = detailsMap.get(key);
      const tvWatchProgress =
        entry.type === "tv" ? extractTvWatchProgressLabel(entry.watched.title ?? "") : null;
      return {
        item: detail ?? entry.baseItem,
        type: entry.type,
        watched: entry.watched,
        tvWatchProgress,
      };
    });
  }, [detailsMap, uniqueItems]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();

    itemsWithCanonicalTitles.forEach(({ item, type }) => {
      const dateValue =
        type === "movie"
          ? (item as TMDBMovie).release_date
          : (item as TMDBSeries).first_air_date;
      if (!dateValue) return;
      const year = new Date(dateValue).getFullYear();
      if (!Number.isNaN(year)) years.add(year);
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [itemsWithCanonicalTitles]);

  const availableWatchedYears = useMemo(() => {
    const years = new Set<number>();
    itemsWithCanonicalTitles.forEach(({ watched }) => {
      const year = new Date(watched.seenAt).getFullYear();
      if (!Number.isNaN(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [itemsWithCanonicalTitles]);

  const sortEntries = useMemo(
    () => (entries: typeof itemsWithCanonicalTitles) => {
      const sorted = [...entries];
      sorted.sort((a, b) => {
        const aWatched = new Date(a.watched.seenAt).getTime();
        const bWatched = new Date(b.watched.seenAt).getTime();
        const aTitle = (a.type === "movie" ? (a.item as TMDBMovie).title : (a.item as TMDBSeries).name).toLowerCase();
        const bTitle = (b.type === "movie" ? (b.item as TMDBMovie).title : (b.item as TMDBSeries).name).toLowerCase();
        const aReleaseDate = a.type === "movie" ? (a.item as TMDBMovie).release_date : (a.item as TMDBSeries).first_air_date;
        const bReleaseDate = b.type === "movie" ? (b.item as TMDBMovie).release_date : (b.item as TMDBSeries).first_air_date;
        const aReleaseYear = aReleaseDate ? new Date(aReleaseDate).getFullYear() : 0;
        const bReleaseYear = bReleaseDate ? new Date(bReleaseDate).getFullYear() : 0;

        let compare = 0;
        if (sortField === "title") compare = aTitle.localeCompare(bTitle);
        else if (sortField === "releaseYear") compare = aReleaseYear - bReleaseYear;
        else compare = aWatched - bWatched;

        return sortOrder === "asc" ? compare : -compare;
      });
      return sorted;
    },
    [sortField, sortOrder]
  );

  const filteredItems = useMemo(() => {
    const filtered = itemsWithCanonicalTitles.filter((entry) => {
      const displayTitle = entry.type === "movie" ? (entry.item as TMDBMovie).title : (entry.item as TMDBSeries).name;
      const titleMatch = !searchQuery.trim() || displayTitle.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const mediaTypeMatch = mediaTypeFilter === "all" || entry.type === mediaTypeFilter;
      const releaseDate = entry.type === "movie" ? (entry.item as TMDBMovie).release_date : (entry.item as TMDBSeries).first_air_date;
      const releaseYear = releaseDate ? new Date(releaseDate).getFullYear().toString() : null;
      const releaseYearMatch = yearFilter === "all" || releaseYear === yearFilter;
      return titleMatch && mediaTypeMatch && releaseYearMatch;
    });
    return sortEntries(filtered);
  }, [itemsWithCanonicalTitles, searchQuery, mediaTypeFilter, yearFilter, sortEntries]);

  const filteredTimelineItems = useMemo(() => {
    const filtered = itemsWithCanonicalTitles.filter((entry) => {
      const displayTitle = entry.type === "movie" ? (entry.item as TMDBMovie).title : (entry.item as TMDBSeries).name;
      const titleMatch =
        !searchQuery.trim() ||
        displayTitle.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        entry.watched.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const mediaTypeMatch = mediaTypeFilter === "all" || entry.type === mediaTypeFilter;
      const releaseDate = entry.type === "movie" ? (entry.item as TMDBMovie).release_date : (entry.item as TMDBSeries).first_air_date;
      const releaseYear = releaseDate ? new Date(releaseDate).getFullYear().toString() : null;
      const releaseYearMatch = yearFilter === "all" || releaseYear === yearFilter;
      const watchedYear = new Date(entry.watched.seenAt).getFullYear().toString();
      const watchedYearMatch = watchedYearFilter === "all" || watchedYear === watchedYearFilter;
      return titleMatch && mediaTypeMatch && releaseYearMatch && watchedYearMatch;
    });
    return sortEntries(filtered);
  }, [itemsWithCanonicalTitles, searchQuery, mediaTypeFilter, yearFilter, watchedYearFilter, sortEntries]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage]);

  const timelineGroups = useMemo(() => {
    const grouped = new Map<string, typeof filteredTimelineItems>();

    filteredTimelineItems.forEach((entry) => {
      const watchedDate = new Date(entry.watched.seenAt);
      let groupKey: string;
      if (grouping === "month") {
        groupKey = format(watchedDate, "yyyy-MM");
      } else if (grouping === "week") {
        groupKey = format(startOfWeek(watchedDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
      } else {
        groupKey = format(watchedDate, "yyyy-MM-dd");
      }
      const existing = grouped.get(groupKey);
      if (existing) {
        existing.push(entry);
      } else {
        grouped.set(groupKey, [entry]);
      }
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, items]) => {
        const baseDate = new Date(dateKey);
        if (grouping === "month") {
          return {
            dateKey,
            dayName: format(baseDate, "MMMM"),
            formattedDate: format(baseDate, "yyyy"),
            items,
          };
        }
        if (grouping === "week") {
          const start = startOfWeek(baseDate, { weekStartsOn: 1 });
          const end = endOfWeek(baseDate, { weekStartsOn: 1 });
          return {
            dateKey,
            dayName: `Week of ${format(start, "MMM d")}`,
            formattedDate: `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`,
            items,
          };
        }
        return {
          dateKey,
          dayName: format(baseDate, "EEEE"),
          formattedDate: format(baseDate, "MMM d, yyyy"),
          items,
        };
      });
  }, [filteredTimelineItems, grouping]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (mediaTypeFilter !== "all") count++;
    if (yearFilter !== "all") count++;
    if (watchedYearFilter !== "all") count++;
    if (grouping !== "day") count++;
    if (sortField !== "watchedAt") count++;
    if (sortOrder !== "desc") count++;
    return count;
  }, [searchQuery, mediaTypeFilter, yearFilter, watchedYearFilter, grouping, sortField, sortOrder]);

  const clearFilters = () => {
    setSearchQuery("");
    setMediaTypeFilter("all");
    setYearFilter("all");
    setWatchedYearFilter("all");
    setGrouping("day");
    setSortField("watchedAt");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, mediaTypeFilter, yearFilter, watchedYearFilter, sortField, sortOrder]);

  const watchedFilters = useMemo(
    () => [
      {
        label: "Type",
        value: mediaTypeFilter,
        options: [
          { value: "all", label: "All Types" },
          { value: "movie", label: "Movies", icon: <Film className="h-4 w-4" /> },
          { value: "tv", label: "TV Shows", icon: <Tv className="h-4 w-4" /> },
        ],
        onValueChange: (value: string) => setMediaTypeFilter(value as "all" | "movie" | "tv"),
      },
      {
        label: "Release Year",
        value: yearFilter,
        options: [{ value: "all", label: "All Years" }, ...availableYears.map((year) => ({ value: year.toString(), label: year.toString() }))],
        onValueChange: setYearFilter,
      },
      {
        label: "Watched Year",
        value: watchedYearFilter,
        options: [{ value: "all", label: "All Watched" }, ...availableWatchedYears.map((year) => ({ value: year.toString(), label: year.toString() }))],
        onValueChange: setWatchedYearFilter,
      },
      ...(viewMode === "timeline"
        ? [
            {
              label: "Grouping",
              value: grouping,
              options: [
                { value: "day", label: "Day" },
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
              ],
              onValueChange: (value: string) => setGrouping(value as Grouping),
            },
          ]
        : []),
      {
        label: "Sort By",
        value: `${sortField}-${sortOrder}`,
        options: [
          { value: "watchedAt-desc", label: "Date Watched (Newest)" },
          { value: "watchedAt-asc", label: "Date Watched (Oldest)" },
          { value: "title-asc", label: "Title (A-Z)" },
          { value: "title-desc", label: "Title (Z-A)" },
          { value: "releaseYear-desc", label: "Release Year (Newest)" },
          { value: "releaseYear-asc", label: "Release Year (Oldest)" },
        ],
        onValueChange: (value: string) => {
          const [field, order] = value.split("-");
          setSortField(field as SortField);
          setSortOrder(order as "asc" | "desc");
        },
      },
    ],
    [
      mediaTypeFilter,
      yearFilter,
      watchedYearFilter,
      availableYears,
      availableWatchedYears,
      viewMode,
      grouping,
      sortField,
      sortOrder,
    ]
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border/70 p-0.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setViewMode("grid");
                applyWatchedQueryState({ view: "grid" });
              }}
              className={viewMode === "grid" ? "h-7 cursor-pointer px-2.5 text-xs bg-muted text-foreground" : "h-7 cursor-pointer px-2.5 text-xs"}
            >
              Cards
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setViewMode("timeline");
                applyWatchedQueryState({ view: "timeline" });
              }}
              className={viewMode === "timeline" ? "h-7 cursor-pointer px-2.5 text-xs bg-muted text-foreground" : "h-7 cursor-pointer px-2.5 text-xs"}
            >
              Timeline
            </Button>
          </div>
        </div>

        <div className="flex-1 sm:flex-initial">
          <FilterSearchBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search watched titles..."
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
            filters={watchedFilters}
            hasActiveFilters={activeFilterCount > 0}
            onClearAll={clearFilters}
            renderFilterRowOutside
            onFilterRowStateChange={setIsFilterRowOpen}
            iconOnlyControls
            searchMaxWidth="sm:max-w-[24rem] lg:max-w-[28rem]"
            justifyEnd
          />
        </div>
      </div>
      {viewMode === "timeline" ? (
        <div className="hidden sm:flex items-center justify-end">
          <div className="inline-flex rounded-md border border-border/70 p-0.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setTimelineLayout("row-list")}
              className={
                timelineLayout === "row-list"
                  ? "h-7 cursor-pointer px-2.5 text-xs bg-muted text-foreground"
                  : "h-7 cursor-pointer px-2.5 text-xs"
              }
            >
              Row List
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setTimelineLayout("carousel")}
              className={
                timelineLayout === "carousel"
                  ? "h-7 cursor-pointer px-2.5 text-xs bg-muted text-foreground"
                  : "h-7 cursor-pointer px-2.5 text-xs"
              }
            >
              Carousel
            </Button>
          </div>
        </div>
      ) : null}
      <FilterRow
        filters={watchedFilters}
        openDropdowns={openDropdowns}
        setOpenDropdowns={setOpenDropdowns}
        toggleDropdown={(label) => setOpenDropdowns((prev) => ({ ...prev, [label]: !prev[label] }))}
        getFilterDisplayValue={(filter) => {
          const option = filter.options.find((opt) => opt.value === filter.value);
          return option?.label || filter.value;
        }}
        handleFilterValueChange={(label, value, onValueChange) => {
          onValueChange(value);
          setOpenDropdowns((prev) => ({ ...prev, [label]: false }));
        }}
        onClearAll={clearFilters}
        hasActiveFilters={activeFilterCount > 0}
        isOpen={isFilterRowOpen}
      />
      {/* Content */}
      {(viewMode === "timeline"
        ? isLoading || isLoadingDetails
        : isLoading || isLoadingDetails) ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <MoreLikeThisCardSkeleton key={i} />
          ))}
        </div>
      ) : ((viewMode === "timeline" ? filteredTimelineItems.length === 0 : filteredItems.length === 0)) ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {activeFilterCount > 0 ? "No entries match your filters" : "No watched items yet"}
          </h3>
          <p className="text-muted-foreground">
            {activeFilterCount > 0
              ? "Try adjusting filters, sort, or grouping."
              : "Start watching films and TV shows to see them here"}
          </p>
          {activeFilterCount > 0 ? (
            <Button variant="outline" onClick={clearFilters} className="mt-4 cursor-pointer">
              Clear All Filters
            </Button>
          ) : null}
        </div>
      ) : viewMode === "timeline" ? (
        <div className="space-y-10">
          {timelineGroups.map((group) => (
            <div key={group.dateKey} className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
              <div className="mb-6 flex items-center gap-4">
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/20 bg-background">
                  <CalendarIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{group.dayName}</h3>
                  <p className="text-sm text-muted-foreground">{group.formattedDate}</p>
                </div>
              </div>
              {timelineLayout === "carousel" ? (
                <div className="ml-20 md:ml-24 relative">
                  <Carousel
                    opts={{
                      align: "start",
                      slidesToScroll: 1,
                    }}
                    className="w-full"
                  >
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
                    {group.items.map(({ item, type, watched, tvWatchProgress }) => {
                        const title = type === "movie" ? (item as TMDBMovie).title : (item as TMDBSeries).name;
                        const timeLabel = format(new Date(watched.seenAt), "h:mm a");
                        const posterPath = "poster_path" in item ? item.poster_path : null;

                        return (
                          <CarouselItem key={`${watched.id}-${type}`} className="pl-2 md:pl-4 basis-[160px]">
                            <Link
                              href={titlePageHref(type, item.id, title)}
                              className="group relative block overflow-hidden rounded-lg border bg-card transition-all hover:shadow-lg"
                            >
                              <div className="absolute -left-6 top-1/2 h-0.5 w-6 -translate-y-1/2 bg-border" />

                              <div className="relative aspect-[2/3] bg-muted rounded-lg overflow-hidden">
                                {posterPath ? (
                                  <Image
                                    src={getPosterUrl(posterPath)}
                                    alt={title}
                                    fill
                                    className="object-cover"
                                    sizes="160px"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    {type === "movie" ? (
                                      <Film className="h-8 w-8 text-muted-foreground" />
                                    ) : (
                                      <Tv className="h-8 w-8 text-muted-foreground" />
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="p-2">
                                <div className="mb-1 flex items-start justify-between gap-1">
                                  <h3 className="line-clamp-1 flex-1 text-xs font-semibold">{title}</h3>
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    {type === "movie" ? (
                                      <Film className="h-3 w-3" />
                                    ) : (
                                      <Tv className="h-3 w-3" />
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <CalendarIcon className="h-3 w-3" />
                                  <span>{timeLabel}</span>
                                </div>
                                {tvWatchProgress ? (
                                  <p className="mt-1 text-[11px] font-medium text-primary/90">{tvWatchProgress}</p>
                                ) : null}
                              </div>
                            </Link>
                          </CarouselItem>
                        );
                      })}
                    </CarouselContent>
                  </Carousel>
                </div>
              ) : (
                <div className="ml-20 space-y-3">
                  {group.items.map(({ item, type, watched, tvWatchProgress }, index) => {
                    const title = type === "movie" ? (item as TMDBMovie).title : (item as TMDBSeries).name;
                    const seenDate = new Date(watched.seenAt);
                    const dayLabel = seenDate.toLocaleDateString("en-US", { weekday: "short" });
                    const seenLabel = seenDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const timeLabel = seenDate.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    });
                    const posterPath = "poster_path" in item ? item.poster_path : null;
                    const isLatest = index === 0;

                    return (
                      <Link
                        key={`${watched.id}-${type}`}
                        href={titlePageHref(type, item.id, title)}
                        className="group relative flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 transition hover:border-primary/30 hover:bg-muted/25"
                      >
                        <div className="absolute -left-6 top-1/2 h-0.5 w-6 -translate-y-1/2 bg-border" />
                        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                          {posterPath ? (
                            <Image
                              src={getPosterUrl(posterPath, "w200")}
                              alt={title}
                              fill
                              className="object-cover"
                              sizes="40px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              {type === "movie" ? <Film className="h-4 w-4" /> : <Tv className="h-4 w-4" />}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">{title}</p>
                            {isLatest ? (
                              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                                Latest
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">{dayLabel} · {seenLabel} · {timeLabel}</p>
                          {tvWatchProgress ? (
                            <p className="mt-0.5 text-xs font-medium text-primary/90">{tvWatchProgress}</p>
                          ) : null}
                        </div>
                        <span className="text-[11px] text-muted-foreground opacity-0 transition group-hover:opacity-100">Open</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                          {type === "movie" ? "Movie" : "TV"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {paginatedItems.map(({ item, type, tvWatchProgress }) => (
              <div key={`${item.id}-${type}`} className="space-y-1">
                <MoreLikeThisCard
                  item={item}
                  type={type}
                  showTypeBadge
                />
                {type === "tv" && tvWatchProgress ? (
                  <p className="px-1 text-xs font-medium text-primary/90">{tvWatchProgress}</p>
                ) : null}
              </div>
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
