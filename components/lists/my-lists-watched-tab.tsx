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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

const ITEMS_PER_PAGE = 24;

type FilterType = "all" | "movie" | "tv";
type ViewMode = "grid" | "timeline";

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
  const [filterType, setFilterType] = useState<FilterType>(() => {
    const filter = searchParams.get("filter");
    return (filter === "movie" || filter === "tv") ? filter : "all";
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const view = searchParams.get("view");
    return view === "timeline" ? "timeline" : "grid";
  });

  const applyWatchedQueryState = (next: { filter?: FilterType; view?: ViewMode }) => {
    const params = new URLSearchParams(searchParams.toString());
    const effectiveFilter = next.filter ?? filterType;
    const effectiveView = next.view ?? viewMode;
    if (effectiveFilter === "all") {
      params.delete("filter");
    } else {
      params.set("filter", effectiveFilter);
    }
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
    const filter = searchParams.get("filter");
    const view = searchParams.get("view");
    if (filter === "movie" || filter === "tv") {
      setFilterType(filter);
    } else {
      setFilterType("all");
    }
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

  const { data: details = [], isLoading: isLoadingDetails } = useQuery({
    queryKey: [
      "watched-content-details",
      uniqueItems.map((entry) => `${entry.type}-${entry.watched.tmdbId}`),
    ],
    queryFn: async () => {
      const results = await Promise.all(
        uniqueItems.map(async (entry) => {
          const detail = await fetchTMDBDetails(entry.watched.tmdbId, entry.type);
          return {
            key: `${entry.type}-${entry.watched.tmdbId}`,
            detail,
          };
        })
      );
      return results;
    },
    enabled: uniqueItems.length > 0,
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
      return {
        item: detail ?? entry.baseItem,
        type: entry.type,
        watched: entry.watched,
      };
    });
  }, [detailsMap, uniqueItems]);

  // Filter by type
  const filteredItems = useMemo(() => {
    if (filterType === "all") return itemsWithCanonicalTitles;
    return itemsWithCanonicalTitles.filter(({ type }) => type === filterType);
  }, [itemsWithCanonicalTitles, filterType]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage]);

  const timelineGroups = useMemo(() => {
    return filteredItems.reduce<Array<{ label: string; items: typeof filteredItems }>>((acc, entry) => {
      const seenAt = new Date(entry.watched.seenAt);
      const label = seenAt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const existing = acc.find((group) => group.label === label);
      if (existing) {
        existing.items.push(entry);
      } else {
        acc.push({ label, items: [entry] });
      }
      return acc;
    }, []);
  }, [filteredItems]);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filterType} onValueChange={(v) => {
          const nextFilter = v as FilterType;
          setFilterType(nextFilter);
          setCurrentPage(1);
          applyWatchedQueryState({ filter: nextFilter });
        }} className="w-auto">
          <TabsList className="h-auto gap-2 rounded-none bg-transparent p-0">
            <TabsTrigger
              value="all"
              className="h-8 flex-none cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted data-[state=active]:border-primary/50 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="movie"
              className="h-8 flex-none cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted data-[state=active]:border-primary/50 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
            >
              Movies
            </TabsTrigger>
            <TabsTrigger
              value="tv"
              className="h-8 flex-none cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted data-[state=active]:border-primary/50 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
            >
              TV Shows
            </TabsTrigger>
          </TabsList>
        </Tabs>

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

      {/* Content */}
      {isLoading || isLoadingDetails ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <MoreLikeThisCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No watched items yet</h3>
          <p className="text-muted-foreground">
            Start watching films and TV shows to see them here
          </p>
        </div>
      ) : viewMode === "timeline" ? (
        <div className="space-y-10">
          {timelineGroups.map((group) => (
            <div key={group.label} className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
              <div className="mb-5 flex items-center gap-4">
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/20 bg-background">
                  <CalendarIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{group.label}</h3>
              </div>
              <div className="ml-20 space-y-3">
                {group.items.map(({ item, type, watched }, index) => {
                  const title = type === "movie" ? (item as TMDBMovie).title : (item as TMDBSeries).name;
                  const seenDate = new Date(watched.seenAt);
                  const dayLabel = seenDate.toLocaleDateString("en-US", { weekday: "short" });
                  const seenLabel = new Date(watched.seenAt).toLocaleDateString("en-US", {
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
                      </div>
                      <span className="text-[11px] text-muted-foreground opacity-0 transition group-hover:opacity-100">Open</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {type === "movie" ? "Movie" : "TV"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
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
