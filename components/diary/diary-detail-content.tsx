"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUpdateViewingLog, useDeleteViewingLog, useLogViewing, useViewingLogsByContent, type ViewingLog } from "@/hooks/use-viewing-logs";
import { useToggleFavorite, useAddFavorite, useRemoveFavorite } from "@/hooks/use-favorites";
import { useToggleWatchlist } from "@/hooks/use-watchlist";
import { useViewingLogComments, useCreateComment, useUpdateComment, useDeleteComment, useAddReaction, useRemoveReaction, type ViewingLogComment } from "@/hooks/use-viewing-log-comments";
import { useMovieDetails, useTVDetails, useContentVideos, useWatchProviders, useJustWatchCountries, useIMDBRating, useOMDBData } from "@/hooks/use-content-details";
import { getPosterUrl, getBackdropUrl, type TMDBVideo, type TMDBMovie, type TMDBSeries } from "@/lib/tmdb";
import { createContentUrl } from "@/lib/content-slug";
import { format } from "date-fns";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Heart, Star, CalendarIcon, Play, Edit, Trash2, Share2, Plus, 
  MessageSquare, ArrowLeft, BookOpen, Reply, MoreVertical, Filter, ChevronDown, ChevronUp, Smile, Bookmark, Eye, Info
} from "lucide-react";
import { IMDBBadge } from "@/components/ui/imdb-badge";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AddToListDropdown from "@/components/content-detail/add-to-list-dropdown";
import CreatePlaylistModal from "@/components/playlists/create-playlist-modal";
import TrailerModal from "@/components/browse/trailer-modal";
import Script from "next/script";
import Link from "next/link";
import WatchBreakdownSection from "@/components/content-detail/watch-breakdown-section";
import { ShareDropdown } from "@/components/ui/share-dropdown";
import { WatchHistoryModal } from "./watch-history-modal";

interface DiaryDetailContentProps {
  log: ViewingLog;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export default function DiaryDetailContent({ log: initialLog, user }: DiaryDetailContentProps) {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const isOwner = currentUser?.id === user.id;
  
  const [log, setLog] = useState(initialLog);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLogAgainDialogOpen, setIsLogAgainDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<TMDBVideo | null>(null);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [commentFilter, setCommentFilter] = useState("newest");
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [isWatchHistoryModalOpen, setIsWatchHistoryModalOpen] = useState(false);
  const [isWatchModalOpen, setIsWatchModalOpen] = useState(false);
  const [watchCountry, setWatchCountry] = useState("US");
  
  
  const updateLog = useUpdateViewingLog();
  const deleteLog = useDeleteViewingLog();
  const logViewing = useLogViewing();
  const toggleFavorite = useToggleFavorite();
  const toggleWatchlist = useToggleWatchlist();
  const isLiked = toggleFavorite.isFavorite(log.tmdbId, log.mediaType);
  const isInWatchlist = toggleWatchlist.isInWatchlist(log.tmdbId, log.mediaType);
  const { data: comments = [], isLoading: commentsLoading } = useViewingLogComments(log.id, commentFilter);
  const deleteComment = useDeleteComment();
  
  // Fetch movie/TV details
  const { data: movieDetails, isLoading: isLoadingMovie } = useMovieDetails(
    log.mediaType === "movie" ? log.tmdbId : null
  );
  const { data: tvDetails, isLoading: isLoadingTV } = useTVDetails(
    log.mediaType === "tv" ? log.tmdbId : null
  );
  const { data: videosData, isLoading: isLoadingVideos } = useContentVideos(log.mediaType, log.tmdbId);
  const { data: watchAvailability, isLoading: isLoadingWatchAvailability } = useWatchProviders(
    log.mediaType,
    log.tmdbId,
    watchCountry
  );
  const { data: justwatchCountries = [] } = useJustWatchCountries();
  const { data: allViewingLogs = [] } = useViewingLogsByContent(log.tmdbId, log.mediaType);
  const hasMultipleViewings = allViewingLogs.length > 1;
  
  const details = log.mediaType === "movie" ? movieDetails : tvDetails;
  const title = log.title;
  // For TV shows, use the TV show's actual title (without episode info) for the URL
  const urlTitle = log.mediaType === "tv" && tvDetails?.name 
    ? tvDetails.name 
    : log.mediaType === "tv" 
      ? title.replace(/\s+S\d+E\d+.*$/i, "") // Remove "S1E1" pattern if present
      : title;
  const posterPath = log.posterPath;
  const backdropPath = log.backdropPath || log.posterPath;
  
  // Get IMDB ID from details (with type assertion for external_ids)
  const detailsWithExternalIds = details as (typeof details & { external_ids?: { imdb_id?: string | null }; imdb_id?: string | null }) | null;
  const imdbId = detailsWithExternalIds?.external_ids?.imdb_id || detailsWithExternalIds?.imdb_id || null;
  
  // Find trailer
  const trailer: TMDBVideo | null =
    videosData?.results?.find(
      (v: TMDBVideo) => v.type === "Trailer" && v.official && v.site === "YouTube"
    ) ||
    videosData?.results?.find(
      (v: TMDBVideo) => v.type === "Trailer" && v.site === "YouTube"
    ) ||
    null;
  
  const allVideos = videosData?.results || [];
  
  // Create mock item for AddToPlaylistDropdown and toggleFavorite
  const mockMovieItem: TMDBMovie = {
    id: log.tmdbId,
    title: log.title,
    poster_path: log.posterPath,
    backdrop_path: log.backdropPath,
    release_date: log.releaseDate || "",
    overview: details?.overview || "",
    vote_average: 0,
    vote_count: 0,
    genre_ids: [],
    popularity: 0,
    adult: false,
    original_language: "en",
    original_title: log.title,
  };
  
  const mockTVItem: TMDBSeries = {
    id: log.tmdbId,
    name: log.title,
    poster_path: log.posterPath,
    backdrop_path: log.backdropPath,
    first_air_date: log.firstAirDate || "",
    overview: details?.overview || "",
    vote_average: 0,
    vote_count: 0,
    genre_ids: [],
    popularity: 0,
    original_language: "en",
    original_name: log.title,
  };
  
  const mockItem = log.mediaType === "movie" ? mockMovieItem : mockTVItem;
  
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";


  const handleDelete = async () => {
    try {
      await deleteLog.mutateAsync(log.id);
      toast.success("Review deleted");
      router.push(`/${user.username}`);
    } catch {
      toast.error("Failed to delete review");
    }
  };
  
  const watchedDate = new Date(log.watchedAt);
  const releaseYear = log.releaseDate 
    ? new Date(log.releaseDate).getFullYear() 
    : log.firstAirDate 
    ? new Date(log.firstAirDate).getFullYear() 
    : null;

  // Get IMDb rating and OMDB data
  const tmdbRating = details?.vote_average && details.vote_average > 0 ? details.vote_average : null;
  const { data: ratingData, isLoading: isRatingLoading } = useIMDBRating(imdbId, tmdbRating);
  const { data: omdbData, isLoading: isOmdbLoading } = useOMDBData(imdbId);
  
  // Use IMDb rating if available, otherwise fall back to TMDB
  const displayRating = ratingData?.rating || tmdbRating;
  const ratingSource = ratingData?.source || (tmdbRating ? "tmdb" : null);
  const imdbVotes = ratingData?.votes || omdbData?.imdbVotes || null;

  // JustWatch rank
  const jwRanks = watchAvailability?.ranks;
  const jwPrimaryRankRaw = jwRanks?.["7d"] ?? jwRanks?.["30d"] ?? jwRanks?.["1d"];
  const jwPrimaryRank =
    jwPrimaryRankRaw != null &&
    typeof jwPrimaryRankRaw.rank === "number" &&
    Number.isFinite(jwPrimaryRankRaw.rank)
      ? {
          rank: jwPrimaryRankRaw.rank,
          delta: typeof jwPrimaryRankRaw.delta === "number" && Number.isFinite(jwPrimaryRankRaw.delta) ? jwPrimaryRankRaw.delta : 0,
        }
      : null;

  // Format release date
  const releaseDateFormatted = log.releaseDate
    ? new Date(log.releaseDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : log.firstAirDate
    ? new Date(log.firstAirDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : null;

  // Format runtime
  const formatRuntime = (minutes: number | number[] | undefined, isTV: boolean = false): string | null => {
    if (!minutes) return null;
    if (Array.isArray(minutes)) {
      if (isTV && minutes.length > 0) {
        const average = Math.round(minutes.reduce((sum, val) => sum + val, 0) / minutes.length);
        const hours = Math.floor(average / 60);
        const mins = average % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      }
      if (minutes.length > 0) {
        const hours = Math.floor(minutes[0] / 60);
        const mins = minutes[0] % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      }
      return null;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getOfferQuality = (presentationType: string | null | undefined): string => {
    if (!presentationType) return "";
    const quality = presentationType.toLowerCase();
    if (quality.includes("4k") || quality.includes("uhd")) return "4K";
    if (quality.includes("hd") && !quality.includes("uhd")) return "HD";
    if (quality.includes("sd")) return "SD";
    return "";
  };

  const formatOfferPrice = (price: number | null | undefined, currency: string | null | undefined): string => {
    if (!price || !currency) return "";
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    });
    // Remove leading currency code if present (e.g., "US$" -> "$")
    return formatter.format(price).replace(/^[A-Z]{2}\$/, "$");
  };

  const truncateWords = (value: string, maxWords: number): string => {
    const words = value.split(" ");
    if (words.length <= maxWords) return value;
    return words.slice(0, maxWords).join(" ") + "…";
  };

  const runtimeText =
    log.mediaType === "movie"
      ? formatRuntime(movieDetails?.runtime, false)
      : formatRuntime(tvDetails?.episode_run_time, true);

  const rated = log.mediaType === "movie" ? (omdbData?.rated || null) : null;
  const synopsis = details?.overview || null;
  const topWatchOffers = watchAvailability?.allOffers?.slice(0, 8) ?? [];

  const isDetailsLoading = log.mediaType === "movie" ? isLoadingMovie : isLoadingTV;
  const isHeroLine1Loading = isDetailsLoading || isOmdbLoading;
  const isHeroLine2Loading = isRatingLoading || isLoadingWatchAvailability;
  const isHeroLine3Loading = isDetailsLoading;
  const isHeroLine4Loading = isLoadingVideos;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative w-full h-[40vh] sm:h-[50vh] md:h-[60vh] min-h-[250px] sm:min-h-[300px] md:min-h-[400px] overflow-hidden -mt-[65px]">
        {backdropPath ? (
          <>
            <Image
              src={getBackdropUrl(backdropPath, "w1280")}
              alt={title}
              fill
              className="object-cover"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}
        
        {/* Back Button - Only visible on banner */}
        <div className="absolute top-4 left-4 z-20 md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white border-white/20 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
      
      {/* Poster and Movie Info Section - Below banner on mobile, inside on desktop */}
      <div className="relative -mt-16 md:-mt-24 lg:-mt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          {/* Back Button - Desktop only */}
          <div className="hidden md:block mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {posterPath && (
              <Link 
                href={createContentUrl(log.mediaType, log.tmdbId, urlTitle)}
                className="relative w-32 h-48 sm:w-40 sm:h-60 md:w-48 md:h-72 rounded-lg overflow-hidden flex-shrink-0 shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
              >
                <Image
                  src={getPosterUrl(posterPath, "w500")}
                  alt={title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </Link>
            )}
            
            <div className="flex-1 pt-2 sm:pt-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 text-foreground">{title}</h1>
              
              {/* Line 1: Release date . Type . Rated . Runtime */}
              {isHeroLine1Loading ? (
                <div className="mb-2">
                  <Skeleton className="h-4 w-56 mb-1" />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
                  {releaseDateFormatted && (
                    <>
                      <span>{releaseDateFormatted}</span>
                      <span>•</span>
                    </>
                  )}
                  <span className="capitalize">{log.mediaType}</span>
                  {rated && (
                    <>
                      <span>•</span>
                      <span>{rated}</span>
                    </>
                  )}
                  {runtimeText && (
                    <>
                      <span>•</span>
                      <span>{runtimeText}</span>
                    </>
                  )}
                </div>
              )}

              {/* Line 2: IMDb rating . JustWatch rank */}
              {isHeroLine2Loading ? (
                <div className="mb-2">
                  <Skeleton className="h-4 w-40 mb-1" />
                </div>
              ) : (
                <div className="flex items-center gap-4 mb-2 flex-wrap">
                  {displayRating && displayRating > 0 && (
                    <div className="flex items-center gap-2">
                      {ratingSource === "imdb" ? (
                        <IMDBBadge size={20} />
                      ) : (
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      )}
                      <span className="font-semibold text-sm">{displayRating.toFixed(1)}</span>
                      {ratingSource === "imdb" && imdbVotes && (
                        <span className="text-xs text-muted-foreground">
                          ({imdbVotes >= 1000 ? `${(imdbVotes / 1000).toFixed(1)}k` : imdbVotes.toLocaleString()})
                        </span>
                      )}
                    </div>
                  )}
                  {jwPrimaryRank != null && (
                    <div className="flex items-center gap-1.5">
                      <Image
                        src="/jw-icon.png"
                        alt="JustWatch"
                        width={16}
                        height={16}
                        className="object-contain"
                        unoptimized
                      />
                      <span className="font-semibold text-sm text-[#F5C518]">#{jwPrimaryRank.rank}</span>
                      {jwPrimaryRank.delta !== 0 && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium",
                            jwPrimaryRank.delta > 0
                              ? "bg-green-600 text-white"
                              : "bg-red-600 text-white"
                          )}
                        >
                          {jwPrimaryRank.delta > 0 ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                          {Math.abs(jwPrimaryRank.delta)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Line 3: Synopsis with expand/collapse */}
              {isHeroLine3Loading ? (
                <div className="mb-3 space-y-2">
                  <Skeleton className="h-4 w-full max-w-[360px]" />
                  <Skeleton className="h-4 w-3/4 max-w-[280px]" />
                </div>
              ) : (
                synopsis && (
                  <div className="mb-3">
                    <p
                      className={cn(
                        "text-base text-muted-foreground leading-relaxed",
                        !isSynopsisExpanded && "line-clamp-2"
                      )}
                    >
                      {synopsis}
                    </p>
                    {synopsis.length > 100 && (
                      <button
                        onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                        className="mt-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        {isSynopsisExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Hide
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Show more
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )
              )}

              {/* Line 4: Play button and Watch Trailer text */}
              {isHeroLine4Loading ? (
                <div className="flex items-center gap-3">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ) : (
                trailer && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedVideo(trailer);
                        setIsTrailerModalOpen(true);
                      }}
                      className="flex items-center justify-center h-14 w-14 rounded-full border-2 border-foreground/20 bg-background/80 backdrop-blur hover:bg-background/90 transition cursor-pointer"
                      aria-label="Play trailer"
                    >
                      <Play className="h-7 w-7 text-foreground fill-foreground" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedVideo(trailer);
                        setIsTrailerModalOpen(true);
                      }}
                      className="text-sm font-medium text-foreground hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      Watch Trailer
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-14">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
            {/* Review by [username] Section */}
            <div className="p-0 overflow-hidden mb-16">
              <div className="flex items-center gap-3 mb-4">
                {user.avatarUrl ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden">
                    <Image
                      src={user.avatarUrl}
                      alt={user.username || user.displayName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {(user.username || user.displayName)[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold">Review by {user.username || user.displayName}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
              </div>
              
              {/* Movie Title */}
              <h2 className="text-2xl font-bold mb-4">{title}</h2>
              
              {/* Rating */}
              {log.rating && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-5 w-5",
                          star <= log.rating!
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-muted-foreground"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">{log.rating}/5</span>
                </div>
              )}
              
              {/* Date Watched */}
              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <button
                  onClick={() => hasMultipleViewings && setIsWatchHistoryModalOpen(true)}
                  className={cn(
                    "flex items-center gap-1.5",
                    hasMultipleViewings && "cursor-pointer hover:text-foreground transition-colors"
                  )}
                  disabled={!hasMultipleViewings}
                >
                  <span>Watched on {format(watchedDate, "MMMM d, yyyy")}</span>
                  {hasMultipleViewings && (
                    <Info className="h-4 w-4 text-green-500" />
                  )}
                </button>
              </div>
              
              {/* Notes/Review */}
              {log.notes && (
                <div className="mb-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{log.notes}</p>
                </div>
              )}
              
              {/* Review Likes and Watch Status */}
              <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  <span>No likes yet</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-6 w-6 text-green-500" />
                  <span>Watched</span>
                </div>
              </div>
              
              {/* Actions */}
              {isOwner && (
                <div className="pt-4 border-t overflow-x-auto scrollbar-hide">
                  <div className="flex items-center gap-2 min-w-max">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditDialogOpen(true)}
                      className="cursor-pointer"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsLogAgainDialogOpen(true)}
                      className="cursor-pointer"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Log Again
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-destructive hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Actions for all users */}
              <div className="pt-4 border-t mt-4 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-2 min-w-max">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (log.mediaType === "movie") {
                        await toggleFavorite.toggle(mockMovieItem, "movie");
                      } else {
                        await toggleFavorite.toggle(mockTVItem, "tv");
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <Heart 
                      className={cn(
                        "h-4 w-4 mr-2",
                        isLiked ? "text-red-500 fill-red-500" : "text-muted-foreground"
                      )} 
                    />
                    {isLiked ? "Liked" : "Like"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (log.mediaType === "movie") {
                        await toggleWatchlist.toggle(mockMovieItem, "movie");
                      } else {
                        await toggleWatchlist.toggle(mockTVItem, "tv");
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <Bookmark 
                      className={cn(
                        "h-4 w-4 mr-2",
                        isInWatchlist ? "text-blue-500 fill-blue-500" : "text-muted-foreground"
                      )} 
                    />
                    {isInWatchlist ? "In Watchlist" : "Watchlist"}
                  </Button>
                  
                  <AddToListDropdown
                    item={mockItem}
                    type={log.mediaType}
                    trigger={
                      <Button variant="outline" size="sm" className="cursor-pointer">
                        <Plus className="h-4 w-4 mr-2" />
                        Add to List
                      </Button>
                    }
                  />
                  
                  <ShareDropdown
                    shareUrl={shareUrl}
                    title={`${title} - Review by ${user.username || user.displayName}`}
                    description={`Check out this review of ${title} on What2Watch`}
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </div>
            
            {/* Comments Section */}
            <CommentsSection
              logId={log.id}
              comments={comments}
              isLoading={commentsLoading}
              filter={commentFilter}
              onFilterChange={setCommentFilter}
              currentUser={currentUser}
              onDeleteComment={(commentId: string) => {
                deleteComment.mutate({ logId: log.id, commentId });
              }}
            />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6 order-1 lg:order-2">
            {/* Where to Watch */}
            <div className="p-0 lg:sticky lg:top-4 lg:self-start">
              {watchAvailability && topWatchOffers.length > 0 ? (
                <>
                  <div className="overflow-hidden rounded-[5px] border border-border">
                    {/* Heading as first row */}
                    <div className="px-3 py-2 text-base font-semibold bg-muted/60">
                      Where to Watch
                    </div>
                    {topWatchOffers.map((offer, index) => {
                      // After heading row, index 0 should be lighter (bg-muted), index 1 darker (bg-muted/60)
                      const rowBg = index % 2 === 0 ? "bg-muted" : "bg-muted/60";
                      const quality = getOfferQuality(offer.presentationType);
                      const price =
                        offer.monetizationType === "rent" || offer.monetizationType === "buy"
                          ? formatOfferPrice(offer.retailPrice, offer.currency)
                          : "";

                      const metaParts: string[] = [];
                      if (offer.monetizationType === "buy") metaParts.push("Buy");
                      else if (offer.monetizationType === "rent") metaParts.push("Rent");
                      else if (offer.monetizationType === "flatrate") metaParts.push("Stream");
                      else if (offer.monetizationType === "ads") metaParts.push("With Ads");
                      else if (offer.monetizationType === "free") metaParts.push("Free");
                      if (quality) metaParts.push(quality);
                      const metaText = metaParts.join(" · ");
                      const providerName = truncateWords(offer.providerName, 3);

                      return (
                        <div
                          key={`${offer.providerId}-${offer.monetizationType}-${offer.presentationType || index}`}
                          className={cn(
                            "flex items-center justify-between px-3 py-3 text-sm",
                            rowBg
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {offer.iconUrl ? (
                              <div className="relative h-8 w-8 rounded-md overflow-hidden bg-background border border-border flex-shrink-0">
                                <Image
                                  src={offer.iconUrl}
                                  alt={offer.providerName}
                                  fill
                                  className="object-contain"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-md bg-muted border border-border flex items-center justify-center flex-shrink-0">
                                <span className="text-xs text-muted-foreground">
                                  {offer.providerName[0]}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-[14px] font-medium truncate">
                                {providerName}
                              </div>
                              {(metaText || price) && (
                                <div className="text-xs mt-0.5">
                                  {metaText && (
                                    <span className="text-muted-foreground">{metaText}</span>
                                  )}
                                  {metaText && price && <span className="text-muted-foreground"> · </span>}
                                  {price && (
                                    <span className="text-[#E0B416]">{price}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {(offer.standardWebUrl || offer.deepLinkUrl) && (
                            <a
                              href={offer.standardWebUrl ?? offer.deepLinkUrl ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-primary hover:underline whitespace-nowrap cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {offer.monetizationType === "flatrate" && "Watch now"}
                              {offer.monetizationType === "rent" && "Rent now"}
                              {offer.monetizationType === "buy" && "Buy now"}
                              {offer.monetizationType !== "flatrate" &&
                                offer.monetizationType !== "rent" &&
                                offer.monetizationType !== "buy" &&
                                "Watch now"}
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between mt-3 text-[13px] text-muted-foreground gap-2">
                    <div className="flex items-center gap-2">
                      <span>Powered by</span>
                      <Image
                        src="https://widget.justwatch.com/assets/JW_logo_color_10px.svg"
                        alt="JustWatch"
                        width={66}
                        height={10}
                        unoptimized
                      />
                    </div>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline cursor-pointer"
                      onClick={() => setIsWatchModalOpen(true)}
                    >
                      View all
                    </button>
                  </div>
                </>
              ) : (
                <div className="overflow-hidden rounded-[5px] border border-border">
                  {/* Heading skeleton */}
                  <div className="px-3 py-2 bg-muted/60">
                    <Skeleton className="h-4 w-32" />
                  </div>
                  {/* Offer row skeletons */}
                  {[0, 1, 2, 3].map((index) => {
                    const rowBg = index % 2 === 0 ? "bg-muted" : "bg-muted/60";
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center justify-between px-3 py-3",
                          rowBg
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Skeleton className="h-8 w-8 rounded-md flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-20 flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <EditLogDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          log={log}
          onUpdate={(updatedLog) => {
            setLog(updatedLog);
            setIsEditDialogOpen(false);
          }}
          isPending={updateLog.isPending}
        />
      )}

      {/* Where to Watch - Full Modal */}
      {watchAvailability && (
        <Dialog open={isWatchModalOpen} onOpenChange={setIsWatchModalOpen}>
          <DialogContent className="sm:max-w-none lg:max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-muted-foreground">
                Where to Watch{" "}
                <span className="text-foreground font-semibold">{title}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto scrollbar-thin px-1 py-4 min-h-0">
              <WatchBreakdownSection
                availability={watchAvailability}
                isLoading={false}
                watchCountry={watchCountry}
                onWatchCountryChange={setWatchCountry}
                justwatchCountries={justwatchCountries}
                compact
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Log Again Dialog */}
      {isLogAgainDialogOpen && (
        <LogAgainDialog
          isOpen={isLogAgainDialogOpen}
          onClose={() => setIsLogAgainDialogOpen(false)}
          log={log}
          onSuccess={() => {
            setIsLogAgainDialogOpen(false);
            router.refresh();
          }}
          isPending={logViewing.isPending}
        />
      )}
      
      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLog.isPending} className="cursor-pointer">
              {deleteLog.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Trailer Modal */}
      {selectedVideo && (
        <TrailerModal
          video={selectedVideo}
          videos={allVideos}
          isOpen={isTrailerModalOpen}
          onClose={() => {
            setIsTrailerModalOpen(false);
            setSelectedVideo(null);
          }}
          title={title}
        />
      )}

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreatePlaylistModalOpen}
        onClose={() => setIsCreatePlaylistModalOpen(false)}
      />

      {/* Watch History Modal */}
      {hasMultipleViewings && (
        <WatchHistoryModal
          isOpen={isWatchHistoryModalOpen}
          onClose={() => setIsWatchHistoryModalOpen(false)}
          logs={allViewingLogs}
          title={title}
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
  onUpdate: (log: ViewingLog) => void;
  isPending: boolean;
}

function EditLogDialog({ isOpen, onClose, log, onUpdate, isPending }: EditLogDialogProps) {
  const [watchedDate, setWatchedDate] = useState<Date>(new Date(log.watchedAt));
  const [notes, setNotes] = useState(log.notes || "");
  const [rating, setRating] = useState<number | null>(log.rating || null);
  const [tags, setTags] = useState((log.tags || []).join(", "));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const updateLog = useUpdateViewingLog();
  const toggleFavorite = useToggleFavorite();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const isLiked = toggleFavorite.isFavorite(log.tmdbId, log.mediaType);

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
        releaseDate: log.releaseDate ?? undefined,
        firstAirDate: log.firstAirDate ?? undefined,
      });
    }
  };

  const handleSubmit = async () => {
    if (isPending || updateLog.isPending) return;
    
    try {
      const tagsArray = tags.trim() ? tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
      await updateLog.mutateAsync({
        logId: log.id,
        watchedAt: watchedDate.toISOString(),
        notes: notes.trim() || null,
        rating: rating || null,
        tags: tagsArray,
      });
      onUpdate({
        ...log,
        watchedAt: watchedDate.toISOString(),
        notes: notes.trim() || null,
        rating: rating || null,
        tags: tagsArray,
      });
      toast.success("Review updated");
      onClose();
    } catch {
      toast.error("Failed to update review");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] h-auto overflow-hidden p-0 flex flex-col max-h-[80vh]">
        <DialogHeader className="sticky top-0 z-10 bg-background px-6 pt-6 pb-4 border-b">
          <DialogTitle>Edit Review</DialogTitle>
          <DialogDescription>
            Update your review for &quot;{log.title}&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 min-h-0">
          <div className="space-y-4">
          {/* Favorite Button */}
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

          {/* Tags */}
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
          <Button variant="outline" onClick={onClose} disabled={isPending || updateLog.isPending} className="cursor-pointer">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || updateLog.isPending} className="cursor-pointer">
            {isPending || updateLog.isPending ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Log Again Dialog Component
interface LogAgainDialogProps {
  isOpen: boolean;
  onClose: () => void;
  log: ViewingLog;
  onSuccess: () => void;
  isPending: boolean;
}

function LogAgainDialog({ isOpen, onClose, log, onSuccess, isPending }: LogAgainDialogProps) {
  const [watchedDate, setWatchedDate] = useState<Date>(new Date());
  const [review, setReview] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [tags, setTags] = useState("");
  const [hasWatched, setHasWatched] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const logViewing = useLogViewing();
  const toggleFavorite = useToggleFavorite();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const isLiked = toggleFavorite.isFavorite(log.tmdbId, log.mediaType);

  useEffect(() => {
    if (isOpen) {
      setWatchedDate(new Date());
      setReview("");
      setRating(null);
      setTags("");
      setHasWatched(true);
    }
  }, [isOpen]);

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
        releaseDate: log.releaseDate ?? undefined,
        firstAirDate: log.firstAirDate ?? undefined,
      });
    }
  };

  const handleSubmit = async () => {
    if (logViewing.isPending) return;
    
    try {
      const tagsArray = tags.trim() ? tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
      await logViewing.mutateAsync({
        tmdbId: log.tmdbId,
        mediaType: log.mediaType,
        title: log.title,
        posterPath: log.posterPath || null,
        backdropPath: log.backdropPath || null,
        releaseDate: log.releaseDate || null,
        firstAirDate: log.firstAirDate || null,
        watchedAt: watchedDate.toISOString(),
        notes: review.trim() || null,
        rating: rating || null,
        tags: tagsArray,
      });
      
      toast.success("Film logged to your diary!");
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to log film";
      toast.error(errorMessage.includes("already") ? errorMessage : "Failed to log film. Please try again.");
    }
  };

  const releaseYear = log.releaseDate 
    ? new Date(log.releaseDate).getFullYear() 
    : log.firstAirDate 
    ? new Date(log.firstAirDate).getFullYear() 
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] h-auto overflow-hidden p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="sticky top-0 z-10 bg-background px-6 pt-6 pb-4 border-b">
          <DialogTitle>Log Again</DialogTitle>
          <DialogDescription>
            Log another viewing of &quot;{log.title}&quot;{releaseYear ? ` (${releaseYear})` : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 min-h-0">
          <div className="space-y-4">
          {/* Movie Name and Release Year */}
          <div className="pb-2 border-b">
            <h3 className="font-semibold text-lg">{log.title}</h3>
            {releaseYear && (
              <p className="text-sm text-muted-foreground">{releaseYear}</p>
            )}
          </div>

          {/* I have watched this checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="has-watched"
              checked={hasWatched}
              onCheckedChange={(checked) => setHasWatched(checked === true)}
            />
            <Label htmlFor="has-watched" className="text-sm font-normal cursor-pointer">
              I have watched this
            </Label>
          </div>

          {/* Favorite Button */}
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

          {/* Review Textarea */}
          <div className="space-y-2">
            <Label htmlFor="review">Review (Optional)</Label>
            <Textarea
              id="review"
              placeholder="Add your thoughts, rating, or any notes about this viewing..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={5}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (Optional)</Label>
            <Input
              id="tags"
              placeholder="Add tags separated by commas (e.g., favorite, rewatch, classic)"
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
          <Button onClick={handleSubmit} disabled={logViewing.isPending || !hasWatched} className="cursor-pointer">
            {logViewing.isPending ? "Logging..." : "Log Film"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Comments Section Component
interface CommentsSectionProps {
  logId: string;
  comments: ViewingLogComment[];
  isLoading: boolean;
  filter: string;
  onFilterChange: (filter: string) => void;
  currentUser: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null;
  onDeleteComment: (commentId: string) => void;
}

function CommentsSection({
  logId,
  comments,
  isLoading,
  filter,
  onFilterChange,
  currentUser,
  onDeleteComment,
}: CommentsSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();

  // Filter primary comments (top-level comments without parentCommentId)
  const primaryComments = comments.filter(comment => !comment.parentCommentId);
  
  // Reset showAllComments when filter changes
  useEffect(() => {
    setShowAllComments(false);
  }, [filter]);
  
  // Determine how many comments to show
  const COMMENTS_PER_PAGE = 10;
  const shouldShowToggle = primaryComments.length > COMMENTS_PER_PAGE;
  const displayedComments = showAllComments 
    ? primaryComments 
    : primaryComments.slice(0, COMMENTS_PER_PAGE);
  
  const remainingCount = primaryComments.length - COMMENTS_PER_PAGE;

  const handleEditComment = async (commentId: string, content: string) => {
    try {
      await updateComment.mutateAsync({
        logId,
        commentId,
        content,
      });
      toast.success("Comment updated");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update comment";
      toast.error(errorMessage);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentUser) return;

    try {
      await createComment.mutateAsync({
        logId,
        content: newComment.trim(),
      });
      setNewComment("");
      toast.success("Comment posted");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to post comment";
      toast.error(errorMessage);
    }
  };

  const handlePostReply = async (parentCommentId: string) => {
    if (!replyContent.trim() || !currentUser) return;

    try {
      await createComment.mutateAsync({
        logId,
        content: replyContent.trim(),
        parentCommentId,
      });
      setReplyContent("");
      setReplyingTo(null);
      toast.success("Reply posted");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to post reply";
      toast.error(errorMessage);
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return format(commentDate, "MMM d, yyyy");
  };

  return (
    <div className="p-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
        <Select value={filter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="most-liked">Most Liked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {/* Comment input - only for logged in users */}
        {currentUser && (
          <div className="flex items-start gap-3 pb-4 border-b">
            {currentUser.avatarUrl ? (
              <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={currentUser.avatarUrl}
                  alt={currentUser.displayName || currentUser.username}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium">
                  {(currentUser.displayName || currentUser.username)[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <Textarea
                placeholder="Add a comment..."
                rows={3}
                className="resize-none"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <Button
                size="sm"
                className="mt-2 cursor-pointer"
                onClick={handlePostComment}
                disabled={!newComment.trim() || createComment.isPending}
              >
                {createComment.isPending ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </div>
        )}

        {/* Comments list */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayedComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                logId={logId}
                currentUser={currentUser}
                onDelete={onDeleteComment}
                onEdit={handleEditComment}
                onReply={(commentId) => {
                  setReplyingTo(commentId);
                  setReplyContent("");
                }}
                replyingTo={replyingTo}
                replyContent={replyContent}
                onReplyContentChange={setReplyContent}
                onPostReply={handlePostReply}
                onCancelReply={() => {
                  setReplyingTo(null);
                  setReplyContent("");
                }}
                formatTimeAgo={formatTimeAgo}
              />
            ))}
            
            {/* Show more/less toggle */}
            {shouldShowToggle && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllComments(!showAllComments)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {showAllComments ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Show More ({remainingCount} more)
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Comment Item Component with nested replies
interface CommentItemProps {
  comment: ViewingLogComment;
  logId: string;
  currentUser: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onReply: (commentId: string) => void;
  replyingTo: string | null;
  replyContent: string;
  onReplyContentChange: (content: string) => void;
  onPostReply: (parentCommentId: string) => void;
  onCancelReply: () => void;
  formatTimeAgo: (date: string) => string;
}

function CommentItem({
  comment,
  logId,
  currentUser,
  onDelete,
  onEdit,
  onReply,
  replyingTo,
  replyContent,
  onReplyContentChange,
  onPostReply,
  onCancelReply,
  formatTimeAgo,
}: CommentItemProps) {
  const isOwner = currentUser?.id === comment.userId;
  const isReplying = replyingTo === comment.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showEmojiPicker]);

  // Group reactions by type
  const reactions = comment.reactions || [];
  const reactionsByType = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.reactionType]) {
      acc[reaction.reactionType] = [];
    }
    acc[reaction.reactionType]!.push(reaction);
    return acc;
  }, {} as Record<string, typeof reactions>);

  // Check if current user has reacted
  const userReactions = currentUser
    ? (comment.reactions || []).filter((r) => r.userId === currentUser.id)
    : [];
  const hasLiked = userReactions.some((r) => r.reactionType === "like");
  const userEmojiReactions = userReactions.filter((r) => r.reactionType !== "like");

  const handleToggleLike = async () => {
    if (!currentUser) return;
    
    try {
      if (hasLiked) {
        await removeReaction.mutateAsync({
          logId,
          commentId: comment.id,
          reactionType: "like",
        });
      } else {
        await addReaction.mutateAsync({
          logId,
          commentId: comment.id,
          reactionType: "like",
        });
      }
    } catch {
      toast.error("Failed to toggle like");
    }
  };

  const handleEmojiClick = async (emojiData: EmojiClickData) => {
    if (!currentUser) return;
    
    const emoji = emojiData.emoji;
    const existingReaction = userEmojiReactions.find((r) => r.reactionType === emoji);
    
    try {
      if (existingReaction) {
        // Remove emoji reaction
        await removeReaction.mutateAsync({
          logId,
          commentId: comment.id,
          reactionType: emoji,
        });
      } else {
        // Add emoji reaction
        await addReaction.mutateAsync({
          logId,
          commentId: comment.id,
          reactionType: emoji,
        });
      }
      setShowEmojiPicker(false);
    } catch {
      toast.error("Failed to add reaction");
    }
  };

  const handleRemoveEmojiReaction = async (reactionType: string) => {
    if (!currentUser) return;
    
    try {
      await removeReaction.mutateAsync({
        logId,
        commentId: comment.id,
        reactionType,
      });
    } catch {
      toast.error("Failed to remove reaction");
    }
  };

  // Update editContent when comment changes (e.g., after successful edit)
  useEffect(() => {
    if (!isEditing) {
      setEditContent(comment.content);
    }
  }, [comment.content, isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || isSaving) return;
    
    setIsSaving(true);
    try {
      await onEdit(comment.id, editContent.trim());
      setIsEditing(false);
    } catch {
      // Error is handled by the parent component
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {/* Avatar */}
        {comment.user.avatarUrl ? (
          <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            <Image
              src={comment.user.avatarUrl}
              alt={comment.user.username || comment.user.displayName}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium">
              {(comment.user.username || comment.user.displayName)[0].toUpperCase()}
            </span>
          </div>
        )}

        {/* Comment content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <span className="font-semibold text-sm">
                {comment.user.username || comment.user.displayName}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                {formatTimeAgo(comment.createdAt)}
              </span>
            </div>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleStartEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this comment?")) {
                        onDelete(comment.id);
                      }
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Comment content or edit textarea */}
          {isEditing ? (
            <div className="space-y-2 mb-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || isSaving}
                  className="cursor-pointer"
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed whitespace-pre-wrap mb-2">{comment.content}</p>

              {/* Actions */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {currentUser && (
                  <button
                    onClick={() => onReply(comment.id)}
                    className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Reply className="h-3.5 w-3.5" />
                    Reply
                  </button>
                )}
                
                {/* Reactions */}
                <div className="flex items-center gap-2">
                  {/* Like button */}
                  {currentUser && (
                    <button
                      onClick={handleToggleLike}
                      className={cn(
                        "flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer",
                        hasLiked && "text-red-500"
                      )}
                      disabled={addReaction.isPending || removeReaction.isPending}
                    >
                      <Heart className={cn("h-3.5 w-3.5", hasLiked && "fill-current")} />
                      {comment.likes > 0 && <span>{comment.likes}</span>}
                    </button>
                  )}
                  
                  {/* Emoji picker button */}
                  {currentUser && (
                    <div className="relative" ref={emojiPickerRef}>
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                      >
                        <Smile className="h-3.5 w-3.5" />
                      </button>
                      {showEmojiPicker && (
                        <div className="absolute bottom-full left-0 mb-2 z-50">
                          <div className="relative">
                            <EmojiPicker
                              onEmojiClick={handleEmojiClick}
                              width={300}
                              height={400}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Display emoji reactions */}
                  {Object.entries(reactionsByType)
                    .filter(([type]) => type !== "like")
                    .map(([emoji, reactions]) => {
                      const userHasReacted = userEmojiReactions.some((r) => r.reactionType === emoji);
                      return (
                        <button
                          key={emoji}
                          onClick={() =>
                            userHasReacted
                              ? handleRemoveEmojiReaction(emoji)
                              : handleEmojiClick({ emoji } as EmojiClickData)
                          }
                          className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs hover:bg-muted transition-colors cursor-pointer",
                            userHasReacted && "bg-muted"
                          )}
                          title={`${reactions.length} ${emoji}`}
                        >
                          <span>{emoji}</span>
                          {reactions.length > 1 && <span>{reactions.length}</span>}
                        </button>
                      );
                    })}
                </div>
              </div>
            </>
          )}

          {/* Reply input */}
          {isReplying && currentUser && (
            <div className="mt-3 ml-4 pl-4 border-l-2 border-border">
              <div className="flex gap-2">
                {currentUser.avatarUrl ? (
                  <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={currentUser.avatarUrl}
                      alt={currentUser.displayName || currentUser.username}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium">
                      {(currentUser.displayName || currentUser.username)[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <Textarea
                    placeholder={`Reply to ${comment.user.username || comment.user.displayName}...`}
                    rows={2}
                    className="resize-none text-sm"
                    value={replyContent}
                    onChange={(e) => onReplyContentChange(e.target.value)}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onCancelReply}
                      className="cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onPostReply(comment.id)}
                      disabled={!replyContent.trim()}
                      className="cursor-pointer"
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 space-y-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-full bg-border" />
              </div>

              {/* Reply content */}
              <div className="flex-1">
                <CommentItem
                  comment={reply}
                  logId={logId}
                  currentUser={currentUser}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onReply={onReply}
                  replyingTo={replyingTo}
                  replyContent={replyContent}
                  onReplyContentChange={onReplyContentChange}
                  onPostReply={onPostReply}
                  onCancelReply={onCancelReply}
                  formatTimeAgo={formatTimeAgo}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

