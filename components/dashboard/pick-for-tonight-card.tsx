"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, Check, ChevronLeft, ChevronRight, Heart, ThumbsUp } from "lucide-react";
import { RxCheck } from "react-icons/rx";
import { Button } from "@/components/ui/button";
import { SheetLoadingDots } from "@/components/ui/sheet-loading-dots";
import { IMDBBadge } from "@/components/ui/imdb-badge";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import type { PickForTonightCandidate } from "@/lib/pick-for-tonight-types";
import { cn } from "@/lib/utils";
import { useIsWatched, useQuickWatch, useUnwatch } from "@/hooks/use-viewing-logs";
import { useToggleFavorite } from "@/hooks/use-favorites";
import { useLikeContent, useContentReactions } from "@/hooks/use-content-reactions";
import { useToggleWatchlist } from "@/hooks/use-watchlist";
import type { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { getPosterUrl } from "@/lib/tmdb";
type ApiPicks = {
  picks: PickForTonightCandidate[];
};

export function usePickForTonight() {
  const [showRow, setShowRow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiPicks | null>(null);
  const [insufficientMessage, setInsufficientMessage] = useState<string | null>(null);

  const runPick = useCallback(async () => {
    setShowRow(true);
    setLoading(true);
    setData(null);
    setInsufficientMessage(null);
    try {
      const res = await fetch("/api/ai/pick-for-tonight/cards", { method: "POST" });
      const json = await res.json();

      if (res.status === 403) {
        if (json.error === "BETA_ADMIN_ONLY") {
          toast.error(json.message || "This beta is currently admin-only");
        } else {
          toast.error(json.message || json.error || "Request blocked");
        }
        return;
      }

      if (!res.ok) {
        toast.error(json.error || "Something went wrong");
        return;
      }

      if (json.insufficientContext) {
        setInsufficientMessage(json.message || "Add titles to your library first.");
        return;
      }

      if (json.picks) {
        setData(json as ApiPicks);
        return;
      }

      toast.error("Unexpected response");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  return { showRow, loading, data, insufficientMessage, runPick };
}

export function PickForTonightButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="cursor-pointer border border-primary/15 px-3 text-sm font-medium hover:bg-primary/5"
      onClick={onClick}
    >
      Pick for tonight
    </Button>
  );
}

export function PickForTonightResultsRow({
  showRow,
  loading,
  data,
  insufficientMessage,
}: {
  showRow: boolean;
  loading: boolean;
  data: ApiPicks | null;
  insufficientMessage: string | null;
}) {
  if (!showRow) return null;

  return (
    <div className="mt-4 w-full">
      {loading && <SheetLoadingDots className="min-h-[10rem] py-2" />}

      {!loading && insufficientMessage && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">{insufficientMessage}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/my-list">Watchlist</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/lists">Lists</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/playlists">Playlists</Link>
            </Button>
          </div>
        </div>
      )}

      {!loading && data?.picks?.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.picks.map((pick) => (
            <PickCardItem key={pick.id} item={pick} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function detailHref(pick: PickForTonightCandidate): string {
  return pick.mediaType === "tv" ? `/tv/${pick.tmdbId}` : `/movie/${pick.tmdbId}`;
}

function providerLabel(monetizationType?: string | null): string {
  if (monetizationType === "buy") return "Buy now";
  if (monetizationType === "rent") return "Rent now";
  return "Watch now";
}

function toTMDBShape(item: PickForTonightCandidate): TMDBMovie | TMDBSeries {
  if (item.mediaType === "movie") {
    return {
      id: item.tmdbId,
      title: item.title,
      original_title: item.title,
      overview: item.overview ?? "",
      poster_path: item.posterPath,
      backdrop_path: item.backdropPath,
      release_date: item.releaseDate ?? "",
      vote_average: item.imdbRating ?? 0,
      vote_count: 0,
      genre_ids: [],
      popularity: 0,
      adult: false,
      original_language: "en",
    };
  }
  return {
    id: item.tmdbId,
    name: item.title,
    original_name: item.title,
    overview: item.overview ?? "",
    poster_path: item.posterPath,
    backdrop_path: item.backdropPath,
    first_air_date: item.firstAirDate ?? "",
    vote_average: item.imdbRating ?? 0,
    vote_count: 0,
    genre_ids: [],
    popularity: 0,
    original_language: "en",
  };
}

function PosterActionButton({
  onClick,
  active,
  title,
  children,
  className,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={cn(
        "inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 transition-colors",
        "ring-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
        "disabled:pointer-events-none disabled:opacity-50",
        active
          ? "bg-yellow-500 text-white shadow-sm hover:bg-yellow-500/90"
          : "bg-black/55 text-white hover:bg-black/70",
        className
      )}
    >
      {children}
    </button>
  );
}

function PickCardItem({ item }: { item: PickForTonightCandidate }) {
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const [infoOpen, setInfoOpen] = useState(true);

  const toggleFavorite = useToggleFavorite();
  const toggleWatchlist = useToggleWatchlist();
  const likeContent = useLikeContent();
  const { data: reactionData } = useContentReactions(item.tmdbId, item.mediaType, isSignedIn);
  const { data: watchedData } = useIsWatched(item.tmdbId, item.mediaType, isSignedIn);
  const quickWatch = useQuickWatch();
  const unwatch = useUnwatch();

  const isWatched = watchedData?.isWatched ?? false;
  const watchedLogId = watchedData?.logId ?? null;
  const isLiked = reactionData?.isLiked ?? false;
  const inWatchlist = toggleWatchlist.isInWatchlist(item.tmdbId, item.mediaType);
  const isFavorite = toggleFavorite.isFavorite(item.tmdbId, item.mediaType);

  const mediaItem = useMemo(() => toTMDBShape(item), [item]);

  const promptSignIn = () => {
    toast.info("Sign in to use quick actions.");
    openSignIn?.({
      afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
    });
  };

  const handleToggleWatched = async () => {
    if (!isSignedIn) return promptSignIn();
    try {
      if (isWatched && watchedLogId) {
        await unwatch.mutateAsync(watchedLogId);
      } else {
        await quickWatch.mutateAsync({
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
          title: item.title,
          posterPath: item.posterPath,
          backdropPath: item.backdropPath,
          releaseDate: item.releaseDate,
          firstAirDate: item.firstAirDate,
        });
      }
    } catch {
      toast.error("Failed to update seen status");
    }
  };

  const handleToggleFavorite = async () => {
    if (!isSignedIn) return promptSignIn();
    try {
      await toggleFavorite.toggle(mediaItem, item.mediaType);
    } catch {
      toast.error("Failed to update favorites");
    }
  };

  const handleLike = async () => {
    if (!isSignedIn) return promptSignIn();
    try {
      await likeContent.mutateAsync({ tmdbId: item.tmdbId, mediaType: item.mediaType });
    } catch {
      toast.error("Failed to update like");
    }
  };

  const handleToggleWatchlist = async () => {
    if (!isSignedIn) return promptSignIn();
    try {
      await toggleWatchlist.toggle(mediaItem, item.mediaType);
    } catch {
      toast.error("Failed to update watchlist");
    }
  };

  const handleBookToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setInfoOpen((o) => !o);
  };

  const metadata = [item.releaseYear, item.rated, item.runtimeText].filter(Boolean).join(" • ");
  const provider = item.provider;
  const providerHref = provider?.deepLinkUrl ?? provider?.standardWebUrl ?? "#";
  const isActionPending =
    quickWatch.isPending || unwatch.isPending || toggleFavorite.isLoading || likeContent.isPending || toggleWatchlist.isLoading;

  const posterUrl = item.posterPath
    ? getPosterUrl(item.posterPath, "w500")
    : null;

  return (
    <div className="relative flex w-full min-w-0 flex-row overflow-hidden rounded-lg border border-border bg-card transition-all">
      <div
        className={cn(
          "relative z-0 flex min-h-[140px] min-w-0 flex-shrink-0 self-stretch overflow-hidden bg-muted transition-[width] duration-300 ease-out",
          infoOpen ? "w-24 sm:w-32" : "w-full min-w-0 flex-1"
        )}
      >
        <div className="group/poster relative h-full w-full min-h-0 min-w-0">
          <Link
            href={detailHref(item)}
            className="absolute inset-0 z-0 block"
            onClick={(e) => e.stopPropagation()}
          >
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={item.title}
                fill
                className="object-cover"
                sizes="158px"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No image</div>
            )}
          </Link>

          <div
            className="absolute left-0 right-7 top-0 z-20 flex items-start justify-between gap-0 px-0.5 pt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <PosterActionButton
              onClick={handleToggleWatched}
              active={isWatched}
              title={isWatched ? "Marked as seen" : "Mark as seen"}
              disabled={isActionPending}
            >
              {isWatched ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              ) : (
                <RxCheck className="h-3.5 w-3.5" />
              )}
            </PosterActionButton>
            <PosterActionButton
              onClick={handleToggleFavorite}
              active={isFavorite}
              title="Favorite"
              disabled={isActionPending}
            >
              <Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
            </PosterActionButton>
            <PosterActionButton
              onClick={handleLike}
              active={isLiked}
              title="Like"
              disabled={likeContent.isPending}
            >
              <ThumbsUp className={cn("h-3.5 w-3.5", isLiked && "fill-current")} />
            </PosterActionButton>
            <PosterActionButton
              onClick={handleToggleWatchlist}
              active={inWatchlist}
              title="Watchlist"
              disabled={isActionPending}
            >
              <Bookmark className={cn("h-3.5 w-3.5", inWatchlist && "fill-current")} />
            </PosterActionButton>
          </div>

          <button
            type="button"
            onClick={handleBookToggle}
            className={cn(
              "absolute right-0 top-0 bottom-0 z-30 flex w-7 flex-col items-center justify-center border-l border-border bg-card/95 shadow-sm",
              "hover:bg-muted/80 active:bg-muted transition-colors cursor-pointer"
            )}
            title={infoOpen ? "Close details" : "Open details"}
            aria-expanded={infoOpen}
          >
            {infoOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col border-l border-border transition-all duration-300 ease-out will-change-transform",
          infoOpen
            ? "max-w-full translate-x-0 opacity-100"
            : "w-0 max-w-0 flex-[0] -translate-x-full border-l-0 p-0 opacity-0 [flex-basis:0] overflow-hidden"
        )}
        aria-hidden={!infoOpen}
      >
        <div className="min-w-0 p-4 sm:p-6">
          <div className="mb-2">
            <Link
              href={detailHref(item)}
              className="text-lg font-semibold text-foreground hover:text-primary sm:line-clamp-1"
              onClick={(e) => e.stopPropagation()}
            >
              {item.title}
            </Link>
          </div>

          {metadata && <p className="text-sm text-muted-foreground mt-1">{metadata}</p>}

          <p className="line-clamp-3 text-[13px] leading-[1.35] text-muted-foreground mt-2">
            {item.overview || "No synopsis available yet."}
          </p>

          <div className="flex items-center gap-2 mt-3">
            <IMDBBadge size={24} />
            <span className="text-sm font-medium">{item.imdbRating ? `${item.imdbRating}/10` : "N/A"}</span>
          </div>

          {provider ? (
            <a
              href={providerHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 inline-flex h-10 max-w-full items-stretch overflow-hidden rounded-lg border border-border/60 bg-muted hover:bg-muted/80 transition-colors"
            >
              {provider.iconUrl ? (
                <>
                  <Image
                    src={provider.iconUrl}
                    alt={provider.providerName}
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain"
                    unoptimized
                  />
                  <span className="flex items-center px-3 text-[15px] font-medium">
                    {providerLabel(provider.monetizationType)}
                  </span>
                </>
              ) : (
                <span className="flex items-center px-3 text-[15px] font-medium">
                  {providerLabel(provider.monetizationType)}
                </span>
              )}
            </a>
          ) : (
            <span className="mt-3 text-xs text-muted-foreground">Provider info unavailable</span>
          )}
        </div>
      </div>
    </div>
  );
}

/** @deprecated use usePickForTonight + PickForTonightButton + PickForTonightResultsRow */
export function PickForTonightCard() {
  const p = usePickForTonight();
  return (
    <div className="flex w-full max-w-md flex-col items-end">
      <PickForTonightButton onClick={p.runPick} />
      <PickForTonightResultsRow
        showRow={p.showRow}
        loading={p.loading}
        data={p.data}
        insufficientMessage={p.insufficientMessage}
      />
    </div>
  );
}
