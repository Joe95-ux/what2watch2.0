"use client";

import { useState, useEffect, memo } from "react";
import { useRouter } from "next/navigation";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { PlaylistItem } from "@/hooks/use-playlists";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, GripVertical, Eye, ArrowUpDown, Film, Tv, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { getPosterUrl } from "@/lib/tmdb";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
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
import { IMDBBadge } from "@/components/ui/imdb-badge";
import { createPersonSlug } from "@/lib/person-utils";
import { useUpdatePlaylistItemMutation } from "@/hooks/use-playlists";
import { ChangeOrderModal } from "./change-order-modal";
import type { SortField } from "@/components/shared/collection-filters";

interface DetailedPlaylistItemProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  playlistItem: PlaylistItem;
  playlistId: string;
  isEditMode: boolean;
  isSelected: boolean;
  order?: number;
  index: number;
  totalItems: number;
  onSelect: () => void;
  onRemove?: () => void;
  onItemClick: () => void;
  isLgScreen: boolean;
  sortField: SortField;
  isPublic?: boolean;
}

function DetailedPlaylistItem({
  item,
  type,
  playlistItem,
  playlistId,
  isEditMode,
  isSelected,
  order,
  index,
  totalItems,
  onSelect,
  onRemove,
  onItemClick,
  isLgScreen,
  sortField,
  isPublic,
}: DetailedPlaylistItemProps) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const quickWatch = useQuickWatch();
  const unwatch = useUnwatch();
  const { data: watchedData } = useIsWatched(item.id, type);
  const isWatched = watchedData?.isWatched || false;
  const watchedLogId = watchedData?.logId || null;

  // Note editing state
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(playlistItem.note || "");
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const updatePlaylistItem = useUpdatePlaylistItemMutation(playlistId);

  // Update note value when playlistItem changes
  useEffect(() => {
    setNoteValue(playlistItem.note || "");
  }, [playlistItem.note]);

  // Fetch details for synopsis, director, and cast
  const { data: movieDetails } = useMovieDetails(
    type === "movie" ? item.id : null
  );
  const { data: tvDetails } = useTVDetails(type === "tv" ? item.id : null);
  const details = type === "movie" ? movieDetails : tvDetails;

  // Type assertion for credits
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
      ? detailsWithCredits?.release_date || playlistItem.releaseDate
      : detailsWithCredits?.first_air_date || playlistItem.firstAirDate;
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
      await updatePlaylistItem.mutateAsync({
        itemId: playlistItem.id,
        updates: { note: noteValue || null },
      });
      setIsEditingNote(false);
      toast.success("Note saved");
    } catch {
      toast.error("Failed to save note");
    }
  };

  const handleNoteCancel = () => {
    setNoteValue(playlistItem.note || "");
    setIsEditingNote(false);
  };

  const handleOrderChange = async (newOrder: number) => {
    await updatePlaylistItem.mutateAsync({
      itemId: playlistItem.id,
      updates: { order: newOrder },
    });
    // Toast is shown by the modal, no need to show here
  };

  const formattedAddedDate = format(new Date(playlistItem.createdAt), "MMM d, yyyy");

  return (
    <>
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
        <div className="flex flex-col sm:flex-row gap-4 flex-1 min-w-0">
          <div className="flex flex-row gap-4 flex-1 min-w-0">
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
            {playlistItem.posterPath ? (
              <div className="relative w-20 h-28 sm:w-24 sm:h-36 rounded overflow-hidden flex-shrink-0 bg-muted">
                <Image
                  src={getPosterUrl(playlistItem.posterPath)}
                  alt={playlistItem.title}
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

            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {order !== undefined && (
                  <span className="text-sm text-muted-foreground">
                    {order}.
                  </span>
                )}
                <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                  {playlistItem.title}
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
                            disabled={updatePlaylistItem.isPending}
                            className="cursor-pointer"
                          >
                            {updatePlaylistItem.isPending ? (
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
                            disabled={updatePlaylistItem.isPending}
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
                          !playlistItem.note && "text-muted-foreground/50 italic"
                        )}
                      >
                        {playlistItem.note || "Click to add a note..."}
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
                    {playlistItem.note && (
                      <div
                        className={cn(
                          "mt-2 border-l-4 pl-4 py-2 text-sm rounded-r",
                          isPublic
                            ? "bg-blue-500/20 border-blue-500/30 text-blue-700 dark:text-blue-400"
                            : "bg-orange-500/20 border-orange-500/30 text-orange-700 dark:text-orange-400"
                        )}
                      >
                        {playlistItem.note}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

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
                        disabled={updatePlaylistItem.isPending}
                        className="cursor-pointer"
                      >
                        {updatePlaylistItem.isPending ? (
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
                        disabled={updatePlaylistItem.isPending}
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
                      !playlistItem.note && "text-muted-foreground/50 italic"
                    )}
                  >
                    {playlistItem.note || "Click to add a note..."}
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
                {playlistItem.note && (
                  <div
                    className={cn(
                      "mt-2 border-l-4 pl-4 py-2 text-sm rounded-r",
                      isPublic
                        ? "bg-blue-500/20 border-blue-500/30 text-blue-700 dark:text-blue-400"
                        : "bg-orange-500/20 border-orange-500/30 text-orange-700 dark:text-orange-400"
                    )}
                  >
                    {playlistItem.note}
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
      </div>
      {isOrderModalOpen && order !== undefined && (
        <ChangeOrderModal
          open={isOrderModalOpen}
          onOpenChange={setIsOrderModalOpen}
          currentOrder={order}
          maxOrder={totalItems}
          title={playlistItem.title}
          onConfirm={handleOrderChange}
        />
      )}
    </>
  );
}

export default memo(DetailedPlaylistItem);

