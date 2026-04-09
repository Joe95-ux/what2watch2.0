"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { IoBookmarkSharp } from "react-icons/io5";
import { useReviews, useTMDBReviews } from "@/hooks/use-reviews";
import { useMovieDetails, useTVDetails, useIMDBRating } from "@/hooks/use-content-details";
import { IMDBBadge } from "@/components/ui/imdb-badge";
import ReviewCard from "@/components/reviews/review-card";
import TMDBReviewCard from "@/components/reviews/tmdb-review-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Check } from "lucide-react";
import WriteReviewDialog from "@/components/reviews/write-review-dialog";
import { useUser, useClerk } from "@clerk/nextjs";
import { getPosterUrl, type TMDBMovie, type TMDBSeries } from "@/lib/tmdb";
import { createContentUrl } from "@/lib/content-slug";
import CreateListModal from "@/components/lists/create-list-modal";
import { useToggleWatchlist } from "@/hooks/use-watchlist";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ReviewsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const toggleWatchlist = useToggleWatchlist();
  const [writeDialogOpen, setWriteDialogOpen] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [page, setPage] = useState(1);

  const type = params.type as "movie" | "tv";
  const id = parseInt(params.id as string, 10);

  const { data: movieDetails } = useMovieDetails(type === "movie" ? id : null);
  const { data: tvDetails } = useTVDetails(type === "tv" ? id : null);
  const details = type === "movie" ? movieDetails : tvDetails;
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);

  const [tmdbPage, setTMDBPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"all" | "user" | "tmdb">("all");

  // Fetch user reviews
  const { data, isLoading } = useReviews(id, type, {
    rating: ratingFilter !== "all" ? parseInt(ratingFilter, 10) : null,
    sortBy,
    page,
    limit: 20,
  });

  // Fetch TMDB reviews
  const { data: tmdbData, isLoading: tmdbLoading } = useTMDBReviews(id, type, tmdbPage);

  const userReviews = data?.reviews || [];
  const userPagination = data?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  };

  const tmdbReviews = tmdbData?.results || [];
  const tmdbPagination = {
    page: tmdbData?.page || 1,
    totalPages: tmdbData?.total_pages || 0,
    total: tmdbData?.total_results || 0,
  };

  // Combine reviews for "all" tab
  const allReviews = [
    ...tmdbReviews.map((review) => ({ type: "tmdb" as const, review })),
    ...userReviews.map((review) => ({ type: "user" as const, review })),
  ];

  const { data: editorialLists = [], isLoading: isEditorialListsLoading } = useQuery({
    queryKey: ["reviews-page-editorial-lists"],
    queryFn: async () => {
      const res = await fetch("/api/lists/public?editorialOnly=true&limit=4");
      if (!res.ok) return [];
      const data = await res.json();
      return (data.lists ?? []).slice(0, 4) as Array<Record<string, unknown> & { id: string }>;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: userListsMixed = [], isLoading: isUserListsMixedLoading } = useQuery({
    queryKey: ["reviews-page-user-lists-mixed", id, type],
    queryFn: async () => {
      const genreIds = ((details as { genres?: Array<{ id: number }> } | null)?.genres || [])
        .map((g) => g.id)
        .join(",");
      const listParams = new URLSearchParams({
        limit: "12",
        editorialOnly: "false",
        tmdbId: String(id),
        mediaType: type,
        genreIds,
      });
      const playlistParams = new URLSearchParams({
        limit: "12",
        tmdbId: String(id),
        mediaType: type,
        genreIds,
      });
      const [listsRes, playlistsRes] = await Promise.all([
        fetch(`/api/lists/public?${listParams}`),
        fetch(`/api/playlists/public?${playlistParams}`),
      ]);
      const listsJson = listsRes.ok ? await listsRes.json() : { lists: [] };
      const playlistsJson = playlistsRes.ok ? await playlistsRes.json() : { playlists: [] };
      const lists = (listsJson.lists ?? []) as Array<Record<string, unknown> & { id: string; updatedAt: string }>;
      const playlists = (playlistsJson.playlists ?? []) as Array<Record<string, unknown> & { id: string; updatedAt: string }>;
      const merged = [
        ...lists.map((l) => ({ kind: "list" as const, ...l })),
        ...playlists.map((p) => ({ kind: "playlist" as const, ...p })),
      ];
      merged.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      return merged.slice(0, 8);
    },
    staleTime: 1000 * 60 * 3,
    enabled: Boolean(details),
  });

  const filmTitle =
    type === "movie"
      ? ((details as { title?: string } | null)?.title ?? "Movie")
      : ((details as { name?: string } | null)?.name ?? "TV Show");

  const detailUrl = useMemo(
    () => createContentUrl(type, id, filmTitle),
    [type, id, filmTitle],
  );
  const posterPath = (details as { poster_path?: string | null } | null)?.poster_path ?? null;
  const releaseYearRaw =
    type === "movie"
      ? (details as { release_date?: string } | null)?.release_date
      : (details as { first_air_date?: string } | null)?.first_air_date;
  const releaseYear = releaseYearRaw ? new Date(releaseYearRaw).getFullYear().toString() : null;
  const runtime = type === "movie"
    ? (() => {
        const mins = (details as { runtime?: number } | null)?.runtime;
        if (!mins) return null;
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
      })()
    : (() => {
        const runTimes = (details as { episode_run_time?: number[] } | null)?.episode_run_time;
        if (!runTimes || runTimes.length === 0) return null;
        const avg = Math.round(runTimes.reduce((a, b) => a + b, 0) / runTimes.length);
        return `${Math.floor(avg / 60)}h ${avg % 60}m`;
      })();
  const rating = (details as { vote_average?: number } | null)?.vote_average ?? null;
  const imdbId =
    (details as { imdb_id?: string | null } | null)?.imdb_id ??
    (details as { external_ids?: { imdb_id?: string | null } } | null)?.external_ids?.imdb_id ??
    null;
  const tmdbRatingForDisplay = rating && rating > 0 ? rating : null;
  const { data: ratingData } = useIMDBRating(imdbId, tmdbRatingForDisplay);
  const displayHeaderRating = ratingData?.rating || tmdbRatingForDisplay;

  const watchlistItem = useMemo((): TMDBMovie | TMDBSeries | null => {
    if (!details) return null;
    const overview =
      typeof (details as { overview?: string }).overview === "string"
        ? (details as { overview: string }).overview
        : "";
    const poster_path = (details as { poster_path?: string | null }).poster_path ?? null;
    const backdrop_path = (details as { backdrop_path?: string | null }).backdrop_path ?? null;
    const vote_average = (details as { vote_average?: number }).vote_average ?? 0;
    const vote_count = (details as { vote_count?: number }).vote_count ?? 0;
    const genre_ids = ((details as { genres?: Array<{ id: number }> }).genres ?? []).map((g) => g.id);
    const popularity = (details as { popularity?: number }).popularity ?? 0;
    const original_language =
      (details as { original_language?: string }).original_language ?? "en";

    if (type === "movie") {
      return {
        id,
        title: filmTitle,
        overview,
        poster_path,
        backdrop_path,
        release_date: (details as { release_date?: string }).release_date ?? "",
        vote_average,
        vote_count,
        genre_ids,
        popularity,
        adult: Boolean((details as { adult?: boolean }).adult),
        original_language,
        original_title: filmTitle,
      } as TMDBMovie;
    }

    return {
      id,
      name: filmTitle,
      overview,
      poster_path,
      backdrop_path,
      first_air_date: (details as { first_air_date?: string }).first_air_date ?? "",
      vote_average,
      vote_count,
      genre_ids,
      popularity,
      original_language,
      original_name: filmTitle,
    } as TMDBSeries;
  }, [details, type, id, filmTitle]);

  const promptSignIn = useCallback(
    (message?: string) => {
      toast.info(message ?? "Please sign in to perform this action.");
      openSignIn?.({
        afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
      });
    },
    [openSignIn],
  );

  const handleWatchlistToggle = useCallback(async () => {
    if (!watchlistItem) return;
    if (!isSignedIn) {
      promptSignIn("Sign in to manage your watchlist.");
      return;
    }
    await toggleWatchlist.toggle(watchlistItem, type);
  }, [watchlistItem, isSignedIn, promptSignIn, toggleWatchlist, type]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Scroll to review if hash is present in URL
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const reviewId = window.location.hash.replace("#review-", "");
      if (reviewId) {
        // Wait for reviews to load, then scroll
        if (userReviews.length > 0 || tmdbReviews.length > 0) {
          setTimeout(() => {
            const element = document.getElementById(`review-${reviewId}`);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, 100);
        }
      }
    }
  }, [userReviews, tmdbReviews]);

  return (
    <div className="min-h-screen bg-background">
      <header className="-mt-[65px] border-b border-white/10 bg-zinc-950 text-zinc-50 dark:bg-black pt-20 sm:pt-34 pb-6 sm:pb-8 lg:pb-15">
        <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-3 sm:mb-5 -ml-2 h-9 text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
              {posterPath ? (
                <div className="relative w-16 h-24 sm:w-24 sm:h-36 flex-shrink-0 overflow-visible">
                  <Link
                    href={detailUrl}
                    className="absolute inset-0 block cursor-pointer rounded-md overflow-hidden bg-zinc-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    <Image
                      src={getPosterUrl(posterPath, "w300")}
                      alt={filmTitle}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 64px, 96px"
                      unoptimized
                    />
                  </Link>
                  {watchlistItem ? (
                    <div
                      onClick={handleWatchlistToggle}
                      role="button"
                      tabIndex={0}
                      aria-label={
                        toggleWatchlist.isInWatchlist(id, type)
                          ? "Remove from watchlist"
                          : "Add to watchlist"
                      }
                      className="absolute -top-[14px] -left-[12px] z-20 flex origin-top-left scale-[0.38] cursor-pointer sm:scale-[0.52]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          void handleWatchlistToggle();
                        }
                      }}
                    >
                      <div className="relative flex items-center justify-center">
                        <IoBookmarkSharp
                          className={cn(
                            "w-16 h-21",
                            toggleWatchlist.isInWatchlist(id, type)
                              ? "text-[#E0B416] fill-[#E0B416]"
                              : "text-gray-900 fill-gray-900",
                          )}
                        />
                        {toggleWatchlist.isInWatchlist(id, type) ? (
                          <Check className="absolute top-6 size-6 text-black z-10" />
                        ) : (
                          <Plus className="absolute top-6 size-6 text-white z-10" />
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <Link
                  href={detailUrl}
                  className="group block min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-50 line-clamp-2 group-hover:underline underline-offset-2">
                    {filmTitle}
                  </h1>
                </Link>
                <div className="mt-2 flex items-center gap-2 flex-wrap text-xs sm:text-sm text-zinc-300">
                  {displayHeaderRating && displayHeaderRating > 0 ? (
                    <>
                      <span className="inline-flex items-center gap-1.5">
                        <IMDBBadge size={20} />
                        <span className="font-medium text-zinc-100">
                          {displayHeaderRating.toFixed(1)}
                        </span>
                      </span>
                      <span>•</span>
                    </>
                  ) : null}
                  {releaseYear ? <span>{releaseYear}</span> : null}
                  {runtime ? (
                    <>
                      {releaseYear ? <span>•</span> : null}
                      <span>{runtime}</span>
                    </>
                  ) : null}
                </div>
                <p className="mt-2 text-xs sm:text-sm text-zinc-400">
                  Reviews ({userPagination.total + tmdbPagination.total})
                </p>
              </div>
            </div>
          </div>
      </header>

      <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
          <div className="lg:col-span-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold">All Reviews</h2>
              {user && (
                <Button
                  variant="ghost"
                  onClick={() => setWriteDialogOpen(true)}
                  className="cursor-pointer w-fit h-9 rounded-[20px] px-3"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Review
                </Button>
              )}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mb-6">
              <TabsList>
                <TabsTrigger value="all" className="cursor-pointer">All Reviews</TabsTrigger>
                <TabsTrigger value="tmdb" className="cursor-pointer">
                  TMDB ({tmdbPagination.total})
                </TabsTrigger>
                <TabsTrigger value="user" className="cursor-pointer">
                  User Reviews ({userPagination.total})
                </TabsTrigger>
              </TabsList>

              {/* Filters - Only show for user reviews */}
              {(activeTab === "all" || activeTab === "user") && (
                <div className="flex flex-wrap items-center gap-4 mt-6 mb-6">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Filter by Rating:</label>
                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                      <SelectTrigger className="w-[140px] cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="cursor-pointer">All Ratings</SelectItem>
                        <SelectItem value="10" className="cursor-pointer">10/10</SelectItem>
                        <SelectItem value="9" className="cursor-pointer">9/10</SelectItem>
                        <SelectItem value="8" className="cursor-pointer">8/10</SelectItem>
                        <SelectItem value="7" className="cursor-pointer">7/10</SelectItem>
                        <SelectItem value="6" className="cursor-pointer">6/10</SelectItem>
                        <SelectItem value="5" className="cursor-pointer">5/10</SelectItem>
                        <SelectItem value="4" className="cursor-pointer">4/10</SelectItem>
                        <SelectItem value="3" className="cursor-pointer">3/10</SelectItem>
                        <SelectItem value="2" className="cursor-pointer">2/10</SelectItem>
                        <SelectItem value="1" className="cursor-pointer">1/10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Sort by:</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[180px] cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="featured" className="cursor-pointer">Featured</SelectItem>
                        <SelectItem value="date" className="cursor-pointer">Review Date</SelectItem>
                        <SelectItem value="rating" className="cursor-pointer">Rating</SelectItem>
                        <SelectItem value="helpful" className="cursor-pointer">Most Helpful</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Reviews */}
              {/* All Reviews Tab */}
              <TabsContent value="all" className="mt-0">
                {isLoading || tmdbLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-48 w-full rounded-lg" />
                    ))}
                  </div>
                ) : allReviews.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12 border border-border rounded-lg">
                    <p className="text-sm mb-4">No reviews found</p>
                    {user && (
                      <Button
                        variant="outline"
                        onClick={() => setWriteDialogOpen(true)}
                        className="cursor-pointer"
                      >
                        Be the first to review
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 mb-8">
                    {allReviews.map((item) => (
                      item.type === "tmdb" ? (
                        <TMDBReviewCard key={`tmdb-${item.review.id}`} review={item.review} />
                      ) : (
                        <ReviewCard key={`user-${item.review.id}`} review={item.review} />
                      )
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* TMDB Reviews Tab */}
              <TabsContent value="tmdb" className="mt-0">
                {tmdbLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-48 w-full rounded-lg" />
                    ))}
                  </div>
                ) : tmdbReviews.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12 border border-border rounded-lg">
                    <p className="text-sm mb-4">No TMDB reviews available</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-8">
                      {tmdbReviews.map((review) => (
                        <TMDBReviewCard key={review.id} review={review} />
                      ))}
                    </div>

                    {/* TMDB Pagination */}
                    {tmdbPagination.totalPages > 1 && (
                      <div className="mt-6">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTMDBPage(tmdbPage - 1)}
                                disabled={tmdbPage === 1}
                                className="gap-1 cursor-pointer"
                              >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                              </Button>
                            </PaginationItem>

                            {Array.from({ length: Math.min(5, tmdbPagination.totalPages) }, (_, i) => {
                              let pageNum: number;
                              if (tmdbPagination.totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (tmdbPage <= 3) {
                                pageNum = i + 1;
                              } else if (tmdbPage >= tmdbPagination.totalPages - 2) {
                                pageNum = tmdbPagination.totalPages - 4 + i;
                              } else {
                                pageNum = tmdbPage - 2 + i;
                              }
                              return (
                                <PaginationItem key={pageNum}>
                                  <PaginationLink
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setTMDBPage(pageNum);
                                    }}
                                    isActive={tmdbPage === pageNum}
                                    className="cursor-pointer"
                                  >
                                    {pageNum}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            })}

                            <PaginationItem>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTMDBPage(tmdbPage + 1)}
                                disabled={tmdbPage === tmdbPagination.totalPages}
                                className="gap-1 cursor-pointer"
                              >
                                Next
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* User Reviews Tab */}
              <TabsContent value="user" className="mt-0">
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-48 w-full rounded-lg" />
                    ))}
                  </div>
                ) : userReviews.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12 border border-border rounded-lg">
                    <p className="text-sm mb-4">No user reviews found</p>
                    {user && (
                      <Button
                        variant="outline"
                        onClick={() => setWriteDialogOpen(true)}
                        className="cursor-pointer"
                      >
                        Be the first to review
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-8">
                      {userReviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </div>

                    {/* User Reviews Pagination */}
                    {userPagination.totalPages > 1 && (
                      <div className="mt-6">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1}
                                className="gap-1 cursor-pointer"
                              >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                              </Button>
                            </PaginationItem>

                            {(() => {
                              const pages: (number | "ellipsis")[] = [];
                              pages.push(1);
                              if (page > 3) {
                                pages.push("ellipsis");
                              }
                              for (let i = Math.max(2, page - 1); i <= Math.min(userPagination.totalPages - 1, page + 1); i++) {
                                if (i !== 1 && i !== userPagination.totalPages) {
                                  pages.push(i);
                                }
                              }
                              if (page < userPagination.totalPages - 2) {
                                pages.push("ellipsis");
                              }
                              if (userPagination.totalPages > 1) {
                                pages.push(userPagination.totalPages);
                              }

                              const uniquePages = pages.filter((p, index, self) => {
                                if (p === "ellipsis") {
                                  return index === self.indexOf("ellipsis") ||
                                    (index > 0 && self[index - 1] !== "ellipsis");
                                }
                                return index === self.findIndex((pageNumber) => pageNumber === p);
                              });

                              return uniquePages.map((p, index) => {
                                if (p === "ellipsis") {
                                  return (
                                    <PaginationItem key={`ellipsis-${index}`}>
                                      <span className="px-2">...</span>
                                    </PaginationItem>
                                  );
                                }
                                return (
                                  <PaginationItem key={p}>
                                    <PaginationLink
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handlePageChange(p);
                                      }}
                                      isActive={page === p}
                                      className="cursor-pointer"
                                    >
                                      {p}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              });
                            })()}

                            <PaginationItem>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page === userPagination.totalPages}
                                className="gap-1 cursor-pointer"
                              >
                                Next
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-3">
              <Link
                href="/editorial"
                className="group/title inline-flex items-center gap-2 transition-all duration-300 w-fit cursor-pointer"
              >
                <h3 className="text-lg font-semibold text-foreground group-hover/title:text-primary transition-colors">
                  Editorial Lists
                </h3>
                <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 -translate-x-2 group-hover/title:opacity-100 group-hover/title:translate-x-0 transition-all duration-300 shrink-0" />
              </Link>
              <div className="space-y-2">
                {isEditorialListsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <CompactListCardSkeleton key={`editorial-skeleton-${i}`} />
                  ))
                ) : editorialLists.length > 0 ? (
                  editorialLists.map((list) => (
                    <CompactEditorialListCard key={String(list.id)} list={list} />
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4">
                    No editorial lists yet.
                  </div>
                )}
              </div>
            </div>

            {user && (
              <Button
                type="button"
                variant="ghost"
                className="w-fit rounded-[20px] border-0 bg-transparent hover:bg-muted/60 cursor-pointer h-9 px-3"
                onClick={() => setIsCreateListModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create List
              </Button>
            )}

            <div className="space-y-3">
              <Link
                href="/lists"
                className="group/title inline-flex items-center gap-2 transition-all duration-300 w-fit cursor-pointer"
              >
                <h3 className="text-lg font-semibold text-foreground group-hover/title:text-primary transition-colors">
                  User Lists
                </h3>
                <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 -translate-x-2 group-hover/title:opacity-100 group-hover/title:translate-x-0 transition-all duration-300 shrink-0" />
              </Link>
              <div className="space-y-2">
                {isUserListsMixedLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <CompactListCardSkeleton key={`user-list-skeleton-${i}`} />
                  ))
                ) : userListsMixed.length > 0 ? (
                  userListsMixed.map((row: { kind: "list" | "playlist"; id: string }) => (
                    <CompactRelatedCard key={`${row.kind}-${row.id}`} row={row} />
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4">
                    No lists yet.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        {user && (
          <WriteReviewDialog
            isOpen={writeDialogOpen}
            onClose={() => setWriteDialogOpen(false)}
            tmdbId={id}
            mediaType={type}
            filmData={
              details
                ? {
                    title: filmTitle,
                    posterPath: details.poster_path || null,
                    releaseYear:
                      type === "movie"
                        ? "release_date" in details && details.release_date
                          ? new Date(details.release_date).getFullYear().toString()
                          : null
                        : "first_air_date" in details && details.first_air_date
                        ? new Date(details.first_air_date).getFullYear().toString()
                        : null,
                    runtime:
                      type === "movie"
                        ? "runtime" in details && details.runtime
                          ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
                          : null
                        : "episode_run_time" in details &&
                          details.episode_run_time &&
                          details.episode_run_time.length > 0
                        ? (() => {
                            const avg = Math.round(
                              details.episode_run_time.reduce(
                                (a: number, b: number) => a + b,
                                0
                              ) / details.episode_run_time.length
                            );
                            return `${Math.floor(avg / 60)}h ${avg % 60}m`;
                          })()
                        : null,
                    rating:
                      details.vote_average > 0
                        ? details.vote_average
                        : null,
                  }
                : undefined
            }
          />
        )}

        {user && (
          <CreateListModal
            isOpen={isCreateListModalOpen}
            onClose={() => setIsCreateListModalOpen(false)}
            initialItem={watchlistItem ? { item: watchlistItem, type } : undefined}
          />
        )}
      </div>
    </div>
  );
}

function CompactListCardSkeleton() {
  return (
    <div className="relative flex rounded-lg border border-border overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col p-3 gap-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
      <div className="w-16 sm:w-20 aspect-[3/4] flex-shrink-0">
        <Skeleton className="h-full w-full rounded-r-lg" />
      </div>
    </div>
  );
}

function CompactEditorialListCard({ list }: { list: Record<string, unknown> & { id: string; name?: string } }) {
  const router = useRouter();
  const items = (list.items as Array<{ posterPath?: string | null }> | undefined) ?? [];
  const firstWithPoster = items.find((x) => Boolean(x.posterPath));
  const posterPath = firstWithPoster?.posterPath || null;
  const itemCount =
    (list._count as { items?: number } | undefined)?.items ?? items.length;
  const updatedAt = list.updatedAt
    ? new Date(list.updatedAt as string).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const title = (list.name as string) || "Untitled";

  return (
    <div
      className="relative flex rounded-lg border border-border transition-all group cursor-pointer overflow-hidden"
      onClick={() => router.push(`/lists/${list.id}`)}
    >
      <div className="flex-1 min-w-0 flex flex-col p-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/lists/${list.id}`);
          }}
          className="text-left text-sm font-semibold line-clamp-1 hover:text-primary transition-colors cursor-pointer"
        >
          {title}
        </button>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
          {updatedAt ? `Updated ${updatedAt}` : "Recently updated"} · {itemCount}{" "}
          {itemCount === 1 ? "item" : "items"}
        </p>
      </div>

      {posterPath ? (
        <div className="relative w-16 sm:w-20 aspect-[3/4] rounded-r-lg overflow-hidden flex-shrink-0 bg-muted">
          <Image
            src={getPosterUrl(posterPath, "w200")}
            alt={title}
            fill
            className="object-cover"
            sizes="80px"
            unoptimized
          />
        </div>
      ) : (
        <div className="w-16 sm:w-20 aspect-[3/4] rounded-r-lg bg-muted flex-shrink-0 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">No Image</span>
        </div>
      )}
    </div>
  );
}

function CompactRelatedCard({ row }: { row: Record<string, unknown> & { kind: "list" | "playlist"; id: string; name?: string } }) {
  const router = useRouter();
  const isPlaylist = row.kind === "playlist";
  const href = isPlaylist ? `/playlists/${row.id}` : `/lists/${row.id}`;
  const items = (row.items as Array<{ posterPath?: string | null }> | undefined) ?? [];
  const firstWithPoster = items.find((x) => Boolean(x.posterPath));
  const posterPath = firstWithPoster?.posterPath || null;
  const countList = row._count as { items?: number; youtubeItems?: number } | undefined;
  const itemCount = isPlaylist
    ? (countList?.items ?? 0) + (countList?.youtubeItems ?? 0)
    : countList?.items ?? items.length;
  const updatedAt = row.updatedAt
    ? new Date(row.updatedAt as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  const title = (row.name as string) || "Untitled";

  return (
    <div
      className="relative flex rounded-lg border border-border transition-all group cursor-pointer overflow-hidden"
      onClick={() => router.push(href)}
    >
      <div className="flex-1 min-w-0 flex flex-col p-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(href);
          }}
          className="text-left text-sm font-semibold line-clamp-1 hover:text-primary transition-colors cursor-pointer"
        >
          {title}
        </button>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
          {isPlaylist ? "Playlist · " : "List · "}
          {updatedAt ? `Updated ${updatedAt}` : "Recently updated"} . {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>
      </div>

      {posterPath ? (
        <div className="relative w-16 sm:w-20 aspect-[3/4] rounded-r-lg overflow-hidden flex-shrink-0 bg-muted">
          <Image
            src={getPosterUrl(posterPath, "w200")}
            alt={title}
            fill
            className="object-cover"
            sizes="80px"
            unoptimized
          />
        </div>
      ) : (
        <div className="w-16 sm:w-20 aspect-[3/4] rounded-r-lg bg-muted flex-shrink-0 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">No Image</span>
        </div>
      )}
    </div>
  );
}



