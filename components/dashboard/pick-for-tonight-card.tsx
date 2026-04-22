"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Bookmark, Check, Heart, MoreVertical, ThumbsUp } from "lucide-react";
import { RxCheck } from "react-icons/rx";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SheetLoadingDots } from "@/components/ui/sheet-loading-dots";
import { PickForTonightConfidenceRow } from "@/components/dashboard/pick-for-tonight-confidence-row";
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
type RerankMode = "lighter" | "shorter" | "intense" | "different";

export function usePickForTonight() {
  const [showRow, setShowRow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiPicks | null>(null);
  const [insufficientMessage, setInsufficientMessage] = useState<string | null>(null);
  const [picksHidden, setPicksHidden] = useState(false);
  const [onlyUnseen, setOnlyUnseen] = useState(false);
  const [trendingToday, setTrendingToday] = useState(false);
  const pickInFlightRef = useRef(false);

  const runPick = useCallback(
    async (options?: { onlyUnseen?: boolean; trendingToday?: boolean; rerankMode?: RerankMode; avoidTmdbId?: number }) => {
      if (pickInFlightRef.current) return;
      pickInFlightRef.current = true;
      const unseenFlag = options?.onlyUnseen !== undefined ? options.onlyUnseen : onlyUnseen;
      const trendingFlag = options?.trendingToday !== undefined ? options.trendingToday : trendingToday;
      setShowRow(true);
      setLoading(true);
      setData(null);
      setInsufficientMessage(null);
      try {
        const res = await fetch("/api/ai/pick-for-tonight/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            onlyUnseen: unseenFlag,
            trendingToday: trendingFlag,
            rerankMode: options?.rerankMode,
            avoidTmdbId: options?.avoidTmdbId,
          }),
        });
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
        pickInFlightRef.current = false;
      }
    },
    [onlyUnseen, trendingToday]
  );

  return {
    showRow,
    loading,
    data,
    insufficientMessage,
    runPick,
    picksHidden,
    setPicksHidden,
    onlyUnseen,
    setOnlyUnseen,
    trendingToday,
    setTrendingToday,
  };
}

export function PickForTonightButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={disabled}
      className="cursor-pointer border border-primary/15 px-3 text-sm font-medium hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onClick}
    >
      {disabled ? "Picking…" : "Pick for tonight"}
    </Button>
  );
}

export function PickForTonightActionsMenu({
  picksHidden,
  onPicksHiddenChange,
  onlyUnseen,
  onOnlyUnseenChange,
  trendingToday,
  onTrendingTodayChange,
  showRow,
  runPick,
  loading,
}: {
  picksHidden: boolean;
  onPicksHiddenChange: (hidden: boolean) => void;
  onlyUnseen: boolean;
  onOnlyUnseenChange: (value: boolean) => void;
  trendingToday: boolean;
  onTrendingTodayChange: (value: boolean) => void;
  showRow: boolean;
  runPick: (options?: { onlyUnseen?: boolean; trendingToday?: boolean; rerankMode?: RerankMode; avoidTmdbId?: number }) => Promise<void>;
  loading: boolean;
}) {
  if (!showRow) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={loading}
          className="h-9 w-9 shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Pick for tonight options"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault();
            onOnlyUnseenChange(false);
            onTrendingTodayChange(false);
            if (showRow) void runPick({ onlyUnseen: false, trendingToday: false });
          }}
        >
          Custom picks
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => onPicksHiddenChange(!picksHidden)}
        >
          {picksHidden ? "Show picks" : "Hide picks"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer gap-2.5 py-2 pl-2 pr-2"
          onSelect={(e) => {
            e.preventDefault();
            const next = !onlyUnseen;
            onOnlyUnseenChange(next);
            if (showRow) void runPick({ onlyUnseen: next, trendingToday });
          }}
        >
          <span
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-muted-foreground/50 bg-background",
              onlyUnseen && "border-primary bg-primary/15 text-primary"
            )}
            aria-hidden
          >
            {onlyUnseen ? <Check className="h-3 w-3" strokeWidth={2.5} /> : null}
          </span>
          <span className="text-sm text-foreground">Not seen only</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2.5 py-2 pl-2 pr-2"
          onSelect={(e) => {
            e.preventDefault();
            const next = !trendingToday;
            onTrendingTodayChange(next);
            if (showRow) void runPick({ trendingToday: next, onlyUnseen });
          }}
        >
          <span
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-muted-foreground/50 bg-background",
              trendingToday && "border-primary bg-primary/15 text-primary"
            )}
            aria-hidden
          >
            {trendingToday ? <Check className="h-3 w-3" strokeWidth={2.5} /> : null}
          </span>
          <span className="text-sm text-foreground">Trending today</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

function truncateToWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

/** Trim and collapse whitespace so length limits apply to “real” words, not padding. */
function normalizeLabelWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** At most `max` characters after normalizing spaces; ellipsis counts as one character. */
function truncateToMaxChars(text: string, max: number): string {
  const normalized = normalizeLabelWhitespace(text);
  if (normalized.length <= max) return normalized;
  if (max <= 1) return "…";
  let body = normalized.slice(0, max - 1);
  body = body.replace(/\s+$/, "");
  if (!body) return "…";
  return `${body}…`;
}

/** e.g. "watch on netflix" → CSS `capitalize` yields "Watch On Netflix" */
function providerWatchLabel(provider: NonNullable<PickForTonightCandidate["provider"]>): string {
  const name = truncateToWords(provider.providerName?.trim() || "Provider", 3);
  const t = provider.monetizationType;
  if (t === "buy") return `buy on ${name}`;
  if (t === "rent") return `rent on ${name}`;
  return `watch on ${name}`;
}

function pickIntentQuote(item: PickForTonightCandidate): string {
  const hints = item.hints?.filter(Boolean) ?? [];
  if (hints.length >= 2) return `“Because ${hints[0].toLowerCase()} and ${hints[1].toLowerCase()}.”`;
  if (hints.length === 1) return `“Because ${hints[0].toLowerCase()}.”`;
  return "“Because this best matches your recent taste signals tonight.”";
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

const iconActiveClass = "text-yellow-400 fill-yellow-400 stroke-yellow-400";

function PosterActionButton({
  onClick,
  title,
  children,
  className,
  disabled,
}: {
  onClick: () => void;
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
        "bg-black/55 text-white hover:bg-black/70",
        "ring-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
        "disabled:pointer-events-none disabled:opacity-50",
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

  const metadata = [item.releaseYear, item.rated, item.runtimeText].filter(Boolean).join(" • ");
  const provider = item.provider;
  const providerHref = provider?.deepLinkUrl ?? provider?.standardWebUrl ?? "#";

  const providerLinkLabels = useMemo(() => {
    if (!provider) return null;
    const full = normalizeLabelWhitespace(providerWatchLabel(provider));
    return {
      full,
      mobile: truncateToWords(full, 3),
      desktop: truncateToMaxChars(full, 18),
    };
  }, [provider]);

  const isActionPending =
    quickWatch.isPending || unwatch.isPending || toggleFavorite.isLoading || likeContent.isPending || toggleWatchlist.isLoading;

  const posterUrl = item.posterPath
    ? getPosterUrl(item.posterPath, "w500")
    : null;

  return (
    <div className="relative flex min-h-[240px] w-full min-w-0 flex-row overflow-hidden rounded-lg border border-border bg-card sm:min-h-0 sm:h-[200px]">
      <div className="relative z-0 h-full w-[135px] shrink-0 overflow-hidden bg-muted">
        <div className="group/poster relative h-full w-full">
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
                sizes="135px"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No image</div>
            )}
          </Link>

          <div
            className={cn(
              "absolute inset-x-0 top-0 z-20 flex items-start justify-between p-2 transition-opacity duration-200",
              "opacity-100 lg:opacity-0 lg:pointer-events-none lg:group-hover/poster:pointer-events-auto lg:group-hover/poster:opacity-100"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <PosterActionButton
              onClick={handleToggleWatched}
              title={isWatched ? "Marked as seen" : "Mark as seen"}
              disabled={isActionPending}
            >
              {isWatched ? (
                <Check className={cn("h-3.5 w-3.5", iconActiveClass)} strokeWidth={2.5} />
              ) : (
                <RxCheck className="h-3.5 w-3.5 text-white" />
              )}
            </PosterActionButton>
            <PosterActionButton onClick={handleToggleFavorite} title="Favorite" disabled={isActionPending}>
              <Heart className={cn("h-3.5 w-3.5 text-white", isFavorite && iconActiveClass)} />
            </PosterActionButton>
            <PosterActionButton onClick={handleLike} title="Like" disabled={likeContent.isPending}>
              <ThumbsUp className={cn("h-3.5 w-3.5 text-white", isLiked && iconActiveClass)} />
            </PosterActionButton>
            <PosterActionButton onClick={handleToggleWatchlist} title="Watchlist" disabled={isActionPending}>
              <Bookmark className={cn("h-3.5 w-3.5 text-white", inWatchlist && iconActiveClass)} />
            </PosterActionButton>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-border">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between overflow-y-auto p-4">
          <div className="mb-1.5">
            <Link
              href={detailHref(item)}
              className="line-clamp-1 text-base font-semibold text-foreground hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              {item.title}
            </Link>
          </div>

          {metadata && <p className="text-xs text-muted-foreground">{metadata}</p>}

          <p className="mt-1.5 rounded-md border-l-2 border-primary/40 bg-muted/40 px-2.5 py-2 text-[12px] italic leading-snug text-muted-foreground">
            {pickIntentQuote(item)}
          </p>

          <PickForTonightConfidenceRow
            justwatchRank24h={item.justwatchRank24h}
            justwatchRankDelta24h={item.justwatchRankDelta24h}
            justwatchRankUrl={item.justwatchRankUrl}
            imdbRating={item.imdbRating}
          />

          {provider && providerLinkLabels ? (
            <a
              href={providerHref}
              target="_blank"
              rel="noopener noreferrer"
              title={providerLinkLabels.full}
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-flex h-8 w-fit max-w-max items-stretch overflow-hidden rounded-md border border-border/60 bg-muted capitalize text-[14px] font-medium leading-none hover:bg-muted/80 transition-colors"
            >
              {provider.iconUrl ? (
                <>
                  <Image
                    src={provider.iconUrl}
                    alt={provider.providerName}
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 object-contain"
                    unoptimized
                  />
                  <span className="flex min-w-0 flex-1 items-center truncate px-2.5 sm:hidden">
                    {providerLinkLabels.mobile}
                  </span>
                  <span className="hidden min-w-0 flex-1 items-center truncate px-2.5 sm:flex">
                    {providerLinkLabels.desktop}
                  </span>
                </>
              ) : (
                <>
                  <span className="flex min-w-0 flex-1 items-center truncate px-2.5 sm:hidden">
                    {providerLinkLabels.mobile}
                  </span>
                  <span className="hidden min-w-0 flex-1 items-center truncate px-2.5 sm:flex">
                    {providerLinkLabels.desktop}
                  </span>
                </>
              )}
            </a>
          ) : (
            <span className="mt-2 text-[11px] text-muted-foreground">Provider info unavailable</span>
          )}
        </div>
      </div>
    </div>
  );
}

const RERANK_CHIPS: Array<{ id: "lighter" | "shorter" | "intense" | "different" | "more"; label: string }> = [
  { id: "lighter", label: "Something lighter" },
  { id: "shorter", label: "Shorter runtime" },
  { id: "intense", label: "More intense" },
  { id: "different", label: "Totally different" },
  { id: "more", label: "See more picks" },
];
const RERANK_MODE_CHIPS: Array<{ id: RerankMode; label: string }> = RERANK_CHIPS.filter(
  (chip): chip is { id: RerankMode; label: string } => chip.id !== "more"
);

export function PickForTonightSilentSurface({
  loading,
  data,
  insufficientMessage,
  runPick,
  onlyUnseen,
  trendingToday,
}: {
  loading: boolean;
  data: ApiPicks | null;
  insufficientMessage: string | null;
  runPick: (options?: { onlyUnseen?: boolean; trendingToday?: boolean; rerankMode?: RerankMode; avoidTmdbId?: number }) => Promise<void>;
  onlyUnseen: boolean;
  trendingToday: boolean;
}) {
  const didAutoloadRef = useRef(false);
  const [activeChip, setActiveChip] = useState<null | "lighter" | "shorter" | "intense" | "different">(null);
  const [showMore, setShowMore] = useState(false);
  const [displayedPick, setDisplayedPick] = useState<PickForTonightCandidate | null>(null);
  const [previousPick, setPreviousPick] = useState<PickForTonightCandidate | null>(null);
  const [pendingChip, setPendingChip] = useState<RerankMode | null>(null);

  useEffect(() => {
    if (didAutoloadRef.current) return;
    didAutoloadRef.current = true;
    void runPick();
  }, [runPick]);

  useEffect(() => {
    if (!data?.picks?.length) return;
    if (activeChip) {
      setDisplayedPick(data.picks[0] ?? null);
      return;
    }
    if (!displayedPick) setDisplayedPick(data.picks[0] ?? null);
  }, [activeChip, data, displayedPick]);

  const handleRerank = async (mode: RerankMode) => {
    if (loading) return;
    setPreviousPick(displayedPick);
    setActiveChip(mode);
    setShowMore(false);
    setPendingChip(mode);
    try {
      await runPick({
        onlyUnseen,
        trendingToday,
        rerankMode: mode,
        avoidTmdbId: mode === "different" ? displayedPick?.tmdbId : undefined,
      });
    } finally {
      setPendingChip(null);
    }
  };

  const goBack = () => {
    setActiveChip(null);
    setShowMore(false);
    if (previousPick) setDisplayedPick(previousPick);
  };

  return (
    <div className="mt-3 w-full space-y-3">
      {loading && <SheetLoadingDots className="min-h-[8rem] py-2" />}

      {!loading && insufficientMessage && (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">{insufficientMessage}</p>
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

      {!loading && displayedPick && (
        <>
          {activeChip && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="h-8 w-8 cursor-pointer rounded-full border border-border/70"
                aria-label="Back to previous pick"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex flex-wrap gap-2">
                {RERANK_MODE_CHIPS.map((chip) => (
                  <Button
                    key={chip.id}
                    type="button"
                    variant="ghost"
                    disabled={loading}
                    onClick={() => void handleRerank(chip.id)}
                    className={cn(
                      "h-8 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted",
                      chip.id === activeChip && "border-primary/50 text-foreground"
                    )}
                  >
                    {pendingChip === chip.id ? "Reranking…" : chip.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="w-full max-w-[530px]">
            <PickCardItem item={displayedPick} />
          </div>

          {!activeChip && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">NOT FEELING IT?</p>
              <div className="flex flex-wrap gap-2">
                {RERANK_CHIPS.map((chip) => (
                  <Button
                    key={chip.id}
                    type="button"
                    variant="ghost"
                    disabled={loading}
                    onClick={() =>
                      chip.id === "more"
                        ? setShowMore((v) => !v)
                        : void handleRerank(chip.id)
                    }
                    className={cn(
                      "h-8 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted",
                      chip.id !== "more" && activeChip === chip.id && "border-primary/50 text-foreground"
                    )}
                  >
                    {chip.id !== "more" && pendingChip === chip.id
                      ? "Reranking…"
                      : chip.id === "more" && loading
                        ? "Loading…"
                        : chip.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {showMore && data?.picks?.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.picks.map((pick) => (
                <PickCardItem key={pick.id} item={pick} />
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/** @deprecated use usePickForTonight + PickForTonightButton + PickForTonightResultsRow */
export function PickForTonightCard() {
  const p = usePickForTonight();
  return (
    <div className="flex w-full max-w-md flex-col items-end">
      <div className="flex items-center gap-0.5">
        <PickForTonightButton onClick={() => void p.runPick()} disabled={p.loading} />
        <PickForTonightActionsMenu
          picksHidden={p.picksHidden}
          onPicksHiddenChange={p.setPicksHidden}
          onlyUnseen={p.onlyUnseen}
          onOnlyUnseenChange={p.setOnlyUnseen}
          trendingToday={p.trendingToday}
          onTrendingTodayChange={p.setTrendingToday}
          showRow={p.showRow}
          runPick={p.runPick}
          loading={p.loading}
        />
      </div>
      {!p.picksHidden && (
        <PickForTonightResultsRow
          showRow={p.showRow}
          loading={p.loading}
          data={p.data}
          insufficientMessage={p.insufficientMessage}
        />
      )}
    </div>
  );
}
