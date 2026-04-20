"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, Check, ChevronDown, ChevronUp, Heart, ThumbsUp } from "lucide-react";
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

type ApiPicks = {
  picks: PickForTonightCandidate[];
};

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
    <Button
      type="button"
      size="icon"
      variant="ghost"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={cn(
        "h-8 w-8 rounded-full border border-white/35 bg-black/70 text-white hover:bg-black/80 backdrop-blur-sm",
        active && "border-primary/80 text-primary",
        className
      )}
    >
      {children}
    </Button>
  );
}

function PickCardItem({
  item,
}: {
  item: PickForTonightCandidate;
}) {
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const [infoOpen, setInfoOpen] = useState(true);

  const toggleFavorite = useToggleFavorite();
  const toggleWatchlist = useToggleWatchlist();
  const likeContent = useLikeContent();
  const { data: reactionData, isLoading: isLoadingReactions } = useContentReactions(item.tmdbId, item.mediaType, isSignedIn);
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

  const metadata = [item.releaseYear, item.rated, item.runtimeText].filter(Boolean).join(" • ");
  const provider = item.provider;
  const providerHref = provider?.deepLinkUrl ?? provider?.standardWebUrl ?? "#";
  const isActionPending =
    quickWatch.isPending || unwatch.isPending || toggleFavorite.isLoading || likeContent.isPending || toggleWatchlist.isLoading;

  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
        <div className="group/poster relative h-64 w-full overflow-hidden rounded-md border border-border bg-muted sm:h-64 lg:h-80 lg:w-52 lg:flex-shrink-0">
          <Link href={detailHref(item)} className="absolute inset-0 block">
            {item.posterPath ? (
              <Image
                src={`https://image.tmdb.org/t/p/w500${item.posterPath}`}
                alt={item.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 220px"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] text-muted-foreground">
                No poster
              </div>
            )}
          </Link>

          <div className="absolute left-2 top-2 z-10 flex gap-1.5 opacity-100 transition-all lg:opacity-0 lg:-translate-y-1 lg:group-hover/poster:opacity-100 lg:group-hover/poster:translate-y-0">
            <PosterActionButton
              onClick={handleToggleWatched}
              active={isWatched}
              title={isWatched ? "Marked as seen" : "Mark as seen"}
              disabled={isActionPending}
            >
              <Check className={cn("h-4 w-4", isWatched && "fill-current")} />
            </PosterActionButton>
            <PosterActionButton
              onClick={handleToggleFavorite}
              active={isFavorite}
              title="Favorite"
              disabled={isActionPending}
            >
              <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
            </PosterActionButton>
            <PosterActionButton
              onClick={handleLike}
              active={isLiked}
              title="Like"
              disabled={isLoadingReactions || likeContent.isPending}
            >
              <ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} />
            </PosterActionButton>
            <PosterActionButton
              onClick={handleToggleWatchlist}
              active={inWatchlist}
              title="Watchlist"
              disabled={isActionPending}
            >
              <Bookmark className={cn("h-4 w-4", inWatchlist && "fill-current")} />
            </PosterActionButton>
          </div>
        </div>

        <div className="min-w-0 flex-1 rounded-md border border-border/70 bg-muted/20">
          <div className="flex w-full items-center justify-between px-3 py-2 text-left">
            <Link href={detailHref(item)} className="line-clamp-1 text-base font-semibold hover:underline">
              {item.title}
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => setInfoOpen((v) => !v)}
              title={infoOpen ? "Collapse details" : "Expand details"}
            >
              {infoOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>

          {infoOpen && (
            <div className="space-y-3 border-t border-border/70 px-3 py-3">
              <p className="text-sm text-muted-foreground">{metadata || "Metadata unavailable"}</p>
              <p className="line-clamp-3 text-[13px] leading-[1.35] text-muted-foreground">
                {item.overview || "No synopsis available yet."}
              </p>
              <div className="flex items-center gap-2">
                <IMDBBadge size={24} />
                <span className="text-sm font-medium">{item.imdbRating ? `${item.imdbRating}/10` : "N/A"}</span>
              </div>
              {provider ? (
                <a
                  href={providerHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 max-w-full items-stretch overflow-hidden rounded-lg bg-muted hover:bg-muted/70 transition-colors"
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
                      <span className="flex items-center px-3 text-[14px] font-medium">
                        {providerLabel(provider.monetizationType)}
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center px-3 text-[14px] font-medium">
                      {providerLabel(provider.monetizationType)}
                    </span>
                  )}
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">Provider info unavailable</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PickForTonightCard() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiPicks | null>(null);
  const [insufficientMessage, setInsufficientMessage] = useState<string | null>(null);
  const [showRow, setShowRow] = useState(false);

  const runPick = async () => {
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
  };

  return (
    <div className="flex flex-col items-end">
      <Button
        type="button"
        variant="ghost"
        className="cursor-pointer border border-primary/15 px-3 text-sm font-medium hover:bg-primary/5"
        onClick={runPick}
      >
        Pick for tonight
      </Button>
      {showRow && (
        <div className="mt-4 w-[min(96vw,78rem)] rounded-xl border border-border/80 bg-background p-3 sm:p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="mb-3">
            <h2 className="text-base font-semibold">Pick for tonight</h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Grounded picks from your watchlist, lists, playlists, and title chat context.
            </p>
          </div>

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
      )}
    </div>
  );
}
