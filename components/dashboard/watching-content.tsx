"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ListPlus,
  MessageSquare,
  PlayCircle,
  Smile,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  useAddWatchingThoughtReply,
  useWatchingDashboard,
  useWatchingMutation,
  useWatchingThoughtReaction,
  useWatchingThoughtReplies,
} from "@/hooks/use-watching";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearch } from "@/hooks/use-search";
import { useToggleWatchlist } from "@/hooks/use-watchlist";
import type { WatchingSessionDTO } from "@/lib/watching-types";
import { getPosterUrl, type TMDBMovie, type TMDBSeries } from "@/lib/tmdb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type WatchingFeedCard = {
  id: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  backdropPath: string | null;
  primaryThoughtId: string | null;
  user: string;
  avatar?: string | null;
  status: "watching" | "finished";
  title: string;
  mediaTypeLabel: "Movie" | "TV";
  detailLine: string;
  posterPath: string | null;
  thought?: string;
  comments: Array<{
    id: string;
    content: string;
    isSpoiler: boolean;
    createdAt: string;
  }>;
  startedOrFinished: string;
  reactions: number;
  replies: number;
};

const timeAgo = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
};

const toFeedCard = (session: WatchingSessionDTO): WatchingFeedCard => {
  const userLabel = session.user.displayName || session.user.username || "Unknown user";
  const isWatching = session.status === "WATCHING_NOW";
  const thought = session.thoughts[0]?.content;
  const comments = session.thoughts.slice(1).map((entry) => ({
    id: entry.id,
    content: entry.content,
    isSpoiler: entry.isSpoiler,
    createdAt: entry.createdAt,
  }));
  return {
    id: session.id,
    tmdbId: session.tmdbId,
    mediaType: session.mediaType,
    backdropPath: session.backdropPath,
    primaryThoughtId: session.thoughts[0]?.id ?? null,
    user: userLabel,
    avatar: session.user.avatarUrl,
    status: isWatching ? "watching" : "finished",
    title: session.title,
    mediaTypeLabel: session.mediaType === "movie" ? "Movie" : "TV",
    detailLine: isWatching
      ? `${session.releaseYear ?? "Year unknown"} · ${session.creatorOrDirector ?? "Creator unknown"} · ${Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000))} min in`
      : `${session.releaseYear ?? "Year unknown"} · ${session.creatorOrDirector ?? "Creator unknown"} · wrapped ${timeAgo(session.endedAt || session.updatedAt)}`,
    posterPath: session.posterPath,
    thought,
    comments,
    startedOrFinished: isWatching
      ? `Started ${timeAgo(session.startedAt)}`
      : `Finished ${timeAgo(session.endedAt || session.updatedAt)}`,
    reactions: 0,
    replies: session.thoughts.length,
  };
};

function JustFinishedComment({
  comment,
  showBorder,
}: {
  comment: WatchingFeedCard["comments"][number];
  showBorder: boolean;
}) {
  const [isSpoilerRevealed, setIsSpoilerRevealed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const { data: replies } = useWatchingThoughtReplies(comment.id, true);
  const addReply = useAddWatchingThoughtReply();
  const { addMutation } = useWatchingThoughtReaction();

  const submitReply = async () => {
    const text = replyText.trim();
    if (!text) return;
    try {
      await addReply.mutateAsync({ thoughtId: comment.id, content: text });
      setReplyText("");
      setIsReplying(false);
      toast.success("Reply posted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post reply");
    }
  };

  const reactToComment = async () => {
    try {
      await addMutation.mutateAsync({ thoughtId: comment.id, reactionType: "🔥" });
      toast.success("Reaction added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to react");
    }
  };
  const previewReplies = (replies ?? []).slice(0, 2);

  return (
    <div className={cn("px-[14px] py-[13px]", showBorder ? "border-b border-border/60 dark:border-border/50" : "")}>
      {comment.isSpoiler ? (
        <div className="mb-2">
          <Badge variant="secondary" className="rounded-full bg-amber-500/15 text-[10px] text-amber-600 dark:text-amber-400">
            Spoiler discussion
          </Badge>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setIsSpoilerRevealed(true)}
        className={cn(
          "w-full cursor-pointer rounded-md border border-border/60 px-3 py-2 text-left text-sm transition",
          comment.isSpoiler && !isSpoilerRevealed
            ? "select-none text-transparent [text-shadow:0_0_8px_rgba(148,163,184,0.95)]"
            : "text-foreground"
        )}
      >
        {comment.isSpoiler && !isSpoilerRevealed ? "Click to reveal spoiler" : comment.content}
      </button>
      <div className="mt-2 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={reactToComment}
          disabled={addMutation.isPending}
          className="h-7 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          <Smile className="h-3.5 w-3.5" />
          React
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsReplying((v) => !v)}
          className="h-7 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Reply{typeof replies?.length === "number" ? ` (${replies.length})` : ""}
        </Button>
      </div>
      {isReplying ? (
        <div className="mt-2 flex items-center gap-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="h-8 border-border/60 bg-transparent text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            type="button"
            size="sm"
            onClick={submitReply}
            disabled={addReply.isPending || !replyText.trim()}
            className="h-8 cursor-pointer rounded-[20px] px-3 text-xs"
          >
            Send
          </Button>
        </div>
      ) : null}
      {previewReplies.length ? (
        <div className="mt-2 space-y-1.5 border-l border-border/60 pl-3">
          {previewReplies.map((reply) => {
            const replyUser = reply.user.displayName || reply.user.username || "Someone";
            return (
              <div key={reply.id} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/90">{replyUser}</span>
                <span className="mx-1">·</span>
                <span className="line-clamp-1">{reply.content}</span>
              </div>
            );
          })}
          {(replies?.length ?? 0) > 2 ? (
            <p className="text-[11px] text-muted-foreground">+{(replies?.length ?? 0) - 2} more replies</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FeedCard({ item }: { item: WatchingFeedCard }) {
  const [expandedComments, setExpandedComments] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [localReactions, setLocalReactions] = useState(item.reactions);
  const [localReplies, setLocalReplies] = useState(item.replies);
  const visibleComments = expandedComments ? item.comments : item.comments.slice(0, 10);
  const hasMoreComments = item.comments.length > 10;
  const addReply = useAddWatchingThoughtReply();
  const { addMutation } = useWatchingThoughtReaction();
  const { toggle: toggleWatchlist, isLoading: isWatchlistMutating } = useToggleWatchlist();

  const handleCardReaction = async () => {
    if (!item.primaryThoughtId) {
      toast.message("No thought yet to react to.");
      return;
    }
    try {
      await addMutation.mutateAsync({ thoughtId: item.primaryThoughtId, reactionType: "🔥" });
      setLocalReactions((count) => count + 1);
      toast.success("Reaction added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to react");
    }
  };

  const handleCardReply = async () => {
    const content = replyText.trim();
    if (!item.primaryThoughtId || !content) return;
    try {
      await addReply.mutateAsync({ thoughtId: item.primaryThoughtId, content });
      setReplyText("");
      setIsReplying(false);
      setLocalReplies((count) => count + 1);
      toast.success("Reply posted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post reply");
    }
  };

  const handleWatchlistToggle = async () => {
    try {
      if (item.mediaType === "movie") {
        await toggleWatchlist(
          {
            id: item.tmdbId,
            title: item.title,
            overview: "",
            poster_path: item.posterPath ?? item.backdropPath ?? null,
            backdrop_path: item.backdropPath,
            release_date: "",
            vote_average: 0,
            vote_count: 0,
            genre_ids: [],
            popularity: 0,
            adult: false,
            original_language: "en",
            original_title: item.title,
          },
          "movie"
        );
      } else {
        await toggleWatchlist(
          {
            id: item.tmdbId,
            name: item.title,
            overview: "",
            poster_path: item.posterPath ?? item.backdropPath ?? null,
            backdrop_path: item.backdropPath,
            first_air_date: "",
            vote_average: 0,
            vote_count: 0,
            genre_ids: [],
            popularity: 0,
            original_language: "en",
            original_name: item.title,
          },
          "tv"
        );
      }
      toast.success("Watchlist updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update watchlist");
    }
  };

  return (
    <Card className="gap-0 overflow-hidden rounded-[15px] border border-border/60 bg-muted/25 p-0 dark:border-border/50 dark:bg-muted/15">
      <div className="border-b border-border/60 bg-muted/35 px-[14px] py-[13px] dark:border-border/50 dark:bg-muted/20">
        <div className="flex items-start gap-[10px]">
          <Avatar className="h-9 w-9">
            <AvatarImage src={item.avatar ?? undefined} alt={item.user} />
            <AvatarFallback>{item.user[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{item.user}</p>
              {item.status === "watching" ? (
                <Badge variant="secondary" className="rounded-full bg-emerald-500/15 text-[10px] text-emerald-500">
                  <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  watching now
                </Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full bg-primary/15 text-[10px] text-primary">
                  just finished
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{item.startedOrFinished}</p>
          </div>
        </div>
      </div>

      <div className="border-b border-border/60 px-[14px] py-[13px] dark:border-border/50">
        <div className="flex items-start gap-[10px]">
          <Link href={item.mediaType === "movie" ? `/movie/${item.tmdbId}` : `/tv/${item.tmdbId}`} className="shrink-0">
            {item.posterPath || item.backdropPath ? (
              <div className="relative h-16 w-12 overflow-hidden rounded-md bg-muted">
                <Image
                  src={getPosterUrl(item.posterPath ?? item.backdropPath, "w200")}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="48px"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-16 w-12 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                N/A
              </div>
            )}
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={item.mediaType === "movie" ? `/movie/${item.tmdbId}` : `/tv/${item.tmdbId}`}
                className="truncate text-sm font-medium hover:underline"
              >
                {item.title}
              </Link>
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {item.mediaTypeLabel}
              </Badge>
            </div>
            <p className="line-clamp-1 text-xs text-muted-foreground">{item.detailLine}</p>
          </div>
        </div>
      </div>

      {item.thought ? (
        <div className="border-b border-border/60 px-[14px] py-[13px] dark:border-border/50">
          <p className="text-sm italic text-muted-foreground">"{item.thought}"</p>
        </div>
      ) : null}

      <div
        className={cn(
          "grid grid-cols-3 divide-x divide-border/60",
          item.status === "finished" ? "border-b border-border/60 dark:border-border/50" : ""
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCardReaction}
          disabled={addMutation.isPending || !item.primaryThoughtId}
          className="h-10 cursor-pointer justify-center gap-1.5 rounded-none text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          <Smile className="h-3.5 w-3.5" /> {localReactions}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsReplying((v) => !v)}
          disabled={!item.primaryThoughtId}
          className="h-10 cursor-pointer justify-center gap-1.5 rounded-none text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          <MessageSquare className="h-3.5 w-3.5" /> {localReplies} replies
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleWatchlistToggle}
          disabled={isWatchlistMutating}
          className="h-10 cursor-pointer justify-center gap-1.5 rounded-none text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          <Bookmark className="h-3.5 w-3.5" /> Watchlist
        </Button>
      </div>

      {isReplying ? (
        <div className="border-b border-border/60 px-[14px] py-[10px] dark:border-border/50">
          <div className="flex items-center gap-2">
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="h-8 border-border/60 bg-transparent text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleCardReply}
              disabled={addReply.isPending || !replyText.trim()}
              className="h-8 cursor-pointer rounded-[20px] px-3 text-xs"
            >
              Send
            </Button>
          </div>
        </div>
      ) : null}

      {item.status === "finished" ? (
        <div className="p-0">
          {visibleComments.map((comment, index) => {
            const showBorder = index < visibleComments.length - 1 || hasMoreComments;
            return <JustFinishedComment key={comment.id} comment={comment} showBorder={showBorder} />;
          })}
          {hasMoreComments ? (
            <div className="px-[14px] py-[13px]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpandedComments((value) => !value)}
                className="h-7 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                {expandedComments ? "Show less" : `Show more (${item.comments.length - 10})`}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function RightRail({
  currentSession,
  alsoWatchingCurrent,
  watchingNow,
  justFinished,
  trendingTonight,
  currentUserId,
  thoughtText,
  onThoughtTextChange,
  spoilerMode,
  onSpoilerModeChange,
  onShareThought,
  onUseTrendingItem,
  onChangeTitle,
  isSubmitting,
}: {
  currentSession: WatchingSessionDTO | null;
  alsoWatchingCurrent: WatchingSessionDTO[];
  watchingNow: WatchingSessionDTO[];
  justFinished: WatchingSessionDTO[];
  trendingTonight: Array<{
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string | null;
    releaseYear: number | null;
    watchingCount: number;
  }>;
  currentUserId: string | null | undefined;
  thoughtText: string;
  onThoughtTextChange: (value: string) => void;
  spoilerMode: boolean;
  onSpoilerModeChange: (value: boolean) => void;
  onShareThought: () => void;
  onChangeTitle: () => void;
  onUseTrendingItem: (item: {
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string | null;
  }) => void;
  isSubmitting: boolean;
}) {
  const currentProgress = currentSession?.progressPercent ?? 0;
  const [showAllAlsoWatching, setShowAllAlsoWatching] = useState(false);
  const [alsoWatchingPage, setAlsoWatchingPage] = useState(1);
  const [showAllRepliesToYou, setShowAllRepliesToYou] = useState(false);
  const [repliesToYouPage, setRepliesToYouPage] = useState(1);
  const alsoWatchingPageSize = showAllAlsoWatching ? 20 : 5;
  const alsoWatchingTotalPages = Math.max(1, Math.ceil(alsoWatchingCurrent.length / alsoWatchingPageSize));
  const visibleAlsoWatching = useMemo(() => {
    const start = (alsoWatchingPage - 1) * alsoWatchingPageSize;
    return alsoWatchingCurrent.slice(start, start + alsoWatchingPageSize);
  }, [alsoWatchingCurrent, alsoWatchingPage, alsoWatchingPageSize]);
  const alsoWatchingTitleLabel = useMemo(() => {
    const title = currentSession?.title?.trim();
    if (!title) return "THIS TITLE";
    return title.length > 24 ? `${title.slice(0, 24)}...` : title;
  }, [currentSession?.title]);
  const myThoughtTargets = useMemo(() => {
    const allSessions = [
      ...(currentSession ? [currentSession] : []),
      ...watchingNow,
      ...justFinished,
    ];
    const unique = new Map<string, { thoughtId: string }>();
    for (const session of allSessions) {
      for (const thought of session.thoughts) {
        if (thought.user.id !== currentUserId) continue;
        if (!unique.has(thought.id)) {
          unique.set(thought.id, { thoughtId: thought.id });
        }
      }
    }
    return Array.from(unique.values());
  }, [currentSession, watchingNow, justFinished, currentUserId]);
  const repliesQueries = useQueries({
    queries: myThoughtTargets.map((target) => ({
      queryKey: ["watching-thought-replies", target.thoughtId],
      queryFn: async () => {
        const res = await fetch(`/api/watching/thoughts/${target.thoughtId}/replies`);
        if (!res.ok) throw new Error("Failed to fetch replies");
        const data = (await res.json()) as {
          replies: Array<{
            id: string;
            userId: string;
            content: string;
            createdAt: string;
            user: { displayName: string | null; username: string | null; avatarUrl: string | null };
          }>;
        };
        return data.replies;
      },
      staleTime: 20_000,
    })),
  });
  const repliesToYou = useMemo(() => {
    const all: Array<{
      id: string;
      userName: string;
      userAvatar: string | null;
      text: string;
      createdAt: string;
    }> = [];
    for (const query of repliesQueries) {
      if (!query.data) continue;
      for (const reply of query.data) {
        if (reply.userId === currentUserId) continue;
        all.push({
          id: reply.id,
          userName: reply.user.displayName || reply.user.username || "Someone",
          userAvatar: reply.user.avatarUrl,
          text: reply.content,
          createdAt: reply.createdAt,
        });
      }
    }
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return all;
  }, [repliesQueries, currentUserId]);
  const repliesToYouPageSize = showAllRepliesToYou ? 20 : 5;
  const repliesToYouTotalPages = Math.max(1, Math.ceil(repliesToYou.length / repliesToYouPageSize));
  const visibleRepliesToYou = useMemo(() => {
    const start = (repliesToYouPage - 1) * repliesToYouPageSize;
    return repliesToYou.slice(start, start + repliesToYouPageSize);
  }, [repliesToYou, repliesToYouPage, repliesToYouPageSize]);

  useEffect(() => {
    setAlsoWatchingPage(1);
  }, [showAllAlsoWatching]);

  useEffect(() => {
    setAlsoWatchingPage((page) => Math.min(page, alsoWatchingTotalPages));
  }, [alsoWatchingTotalPages]);

  useEffect(() => {
    setRepliesToYouPage(1);
  }, [showAllRepliesToYou]);

  useEffect(() => {
    setRepliesToYouPage((page) => Math.min(page, repliesToYouTotalPages));
  }, [repliesToYouTotalPages]);

  return (
    <aside className="w-full">
      <section className="border-b border-border/70 px-[14px] py-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">You&apos;re watching</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onChangeTitle}
            className="h-7 cursor-pointer rounded-[20px] px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Change
          </Button>
        </div>

        {currentSession ? (
          <div className="overflow-hidden rounded-[15px] border border-border/60 bg-muted/35 dark:bg-muted/20">
            <div className="flex items-center justify-between border-b border-border/60 px-[10px] py-[8px]">
              <p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Watching now
              </p>
              <p className="text-[12px] text-muted-foreground">Started {timeAgo(currentSession.startedAt)}</p>
            </div>

            <div className="space-y-[10px] px-[10px] py-[10px]">
              <div className="flex items-start gap-[10px]">
                <Link
                  href={currentSession.mediaType === "movie" ? `/movie/${currentSession.tmdbId}` : `/tv/${currentSession.tmdbId}`}
                  className="shrink-0"
                >
                  {currentSession.posterPath ? (
                    <div className="relative h-16 w-12 overflow-hidden rounded-md bg-muted">
                      <Image
                        src={getPosterUrl(currentSession.posterPath, "w200")}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-12 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                      N/A
                    </div>
                  )}
                </Link>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={currentSession.mediaType === "movie" ? `/movie/${currentSession.tmdbId}` : `/tv/${currentSession.tmdbId}`}
                      className="truncate text-[14px] font-medium hover:underline"
                    >
                      {currentSession.title}
                    </Link>
                    <Badge variant="secondary" className="rounded-full text-[10px]">
                      {currentSession.mediaType === "movie" ? "Movie" : "TV"}
                    </Badge>
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    {Math.max(0, currentProgress)}% through
                  </p>
                </div>
              </div>

              <Progress value={Math.max(0, Math.min(100, currentProgress))} className="h-1.5" />

              <Textarea
                rows={2}
                value={thoughtText}
                onChange={(e) => onThoughtTextChange(e.target.value)}
                placeholder="Share a thought - no spoilers"
                className="resize-none border-border/60 bg-transparent text-[13px] focus-visible:ring-0 focus-visible:ring-offset-0"
              />

              <div className="flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  className="h-8 cursor-pointer rounded-[20px] px-4 text-[13px]"
                  disabled={isSubmitting || !thoughtText.trim()}
                  onClick={onShareThought}
                >
                  Share thought
                </Button>
                <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
                  <Checkbox checked={spoilerMode} onCheckedChange={(v) => onSpoilerModeChange(Boolean(v))} />
                  Spoiler
                </label>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">No active session yet.</p>
        )}
      </section>

      <section className="border-b border-border/70 px-[14px] py-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="truncate text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              ALSO WATCHING [{alsoWatchingTitleLabel}]
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 cursor-pointer rounded-[20px] px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setShowAllAlsoWatching((v) => !v)}
                disabled={alsoWatchingCurrent.length <= 5}
              >
                {showAllAlsoWatching ? "Less" : "View all"}
              </Button>
              {showAllAlsoWatching && alsoWatchingTotalPages > 1 ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setAlsoWatchingPage((page) => Math.max(1, page - 1))}
                    disabled={alsoWatchingPage === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setAlsoWatchingPage((page) => Math.min(alsoWatchingTotalPages, page + 1))}
                    disabled={alsoWatchingPage === alsoWatchingTotalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              ) : null}
            </div>
          </div>
          <div className="divide-y divide-border/60">
            {visibleAlsoWatching.map((session) => {
              const minsIn = Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000));
              const inLabel = minsIn <= 1 ? "just started" : `${minsIn} min in`;
              return (
                <div key={session.id} className="flex items-center justify-between gap-2 py-[8px]">
                  <div className="flex min-w-0 items-center gap-[10px]">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={session.user.avatarUrl ?? undefined} />
                      <AvatarFallback>{(session.user.displayName || session.user.username || "U")[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">
                        {session.user.displayName || session.user.username || "Someone"}
                      </p>
                      <p className="truncate text-[12px] text-muted-foreground">
                        -{inLabel} . spoiler free
                      </p>
                    </div>
                  </div>
                  <p className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    LIVE
                  </p>
                </div>
              );
            })}
            {!visibleAlsoWatching.length ? (
              <p className="py-[8px] text-[12px] text-muted-foreground">No one else is watching this right now.</p>
            ) : null}
          </div>
          {showAllAlsoWatching && alsoWatchingTotalPages > 1 ? (
            <div className="mt-2 text-right text-[11px] text-muted-foreground">
              {alsoWatchingPage} / {alsoWatchingTotalPages}
            </div>
          ) : null}
      </section>

      <section className="border-b border-border/70 px-[14px] py-6">
        <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Trending tonight</p>
        <div className="divide-y divide-border/60">
          {trendingTonight.map((item, i) => (
            <div
              key={`${item.mediaType}-${item.tmdbId}`}
              className="flex w-full items-center gap-[10px] py-[8px] text-left hover:bg-muted/30"
            >
              <span className="w-4 text-[12px] font-semibold text-muted-foreground">{i + 1}</span>
              <Link href={item.mediaType === "movie" ? `/movie/${item.tmdbId}` : `/tv/${item.tmdbId}`} className="shrink-0">
                {item.posterPath ? (
                  <div className="relative h-12 w-9 overflow-hidden rounded bg-muted">
                    <Image src={getPosterUrl(item.posterPath, "w200")} alt="" fill className="object-cover" sizes="36px" unoptimized />
                  </div>
                ) : (
                  <div className="flex h-12 w-9 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                    N/A
                  </div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={item.mediaType === "movie" ? `/movie/${item.tmdbId}` : `/tv/${item.tmdbId}`}
                  className="truncate text-[13px] font-medium hover:underline"
                >
                  {item.title}
                </Link>
                <p className="text-[12px] text-muted-foreground">
                  {item.releaseYear ?? "Year unknown"} · {item.mediaType === "movie" ? "Movie" : "TV"}
                </p>
              </div>
              <p className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {item.watchingCount}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 cursor-pointer rounded-[20px] px-2 text-xs text-muted-foreground hover:bg-muted"
                onClick={() =>
                  onUseTrendingItem({
                    tmdbId: item.tmdbId,
                    mediaType: item.mediaType,
                    title: item.title,
                    posterPath: item.posterPath,
                  })
                }
              >
                Use
              </Button>
            </div>
          ))}
          {!trendingTonight.length ? <p className="py-[8px] text-[12px] text-muted-foreground">No sessions yet.</p> : null}
        </div>
      </section>

      <section className="px-[14px] py-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Replies to you</p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAllRepliesToYou((v) => !v)}
              disabled={repliesToYou.length <= 5}
              className="h-7 cursor-pointer rounded-[20px] px-2 text-xs text-muted-foreground hover:bg-muted"
            >
              {showAllRepliesToYou ? "Less" : "See all"}
            </Button>
            {showAllRepliesToYou && repliesToYouTotalPages > 1 ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setRepliesToYouPage((page) => Math.max(1, page - 1))}
                  disabled={repliesToYouPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setRepliesToYouPage((page) => Math.min(repliesToYouTotalPages, page + 1))}
                  disabled={repliesToYouPage === repliesToYouTotalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
        <div className="divide-y divide-border/60">
          {visibleRepliesToYou.map((reply) => (
            <div key={reply.id} className="py-[8px]">
              <div className="mb-1 flex items-center gap-[10px]">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={reply.userAvatar ?? undefined} />
                  <AvatarFallback>{reply.userName[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">{reply.userName}</p>
                  <p className="text-[12px] text-muted-foreground">{timeAgo(reply.createdAt)}</p>
                </div>
              </div>
              <p className="pl-[38px] pr-1 text-[13px] text-foreground/90">{reply.text}</p>
            </div>
          ))}
          {!repliesToYou.length ? <p className="py-[8px] text-[12px] text-muted-foreground">No replies yet.</p> : null}
        </div>
        {showAllRepliesToYou && repliesToYouTotalPages > 1 ? (
          <div className="mt-2 text-right text-[11px] text-muted-foreground">
            {repliesToYouPage} / {repliesToYouTotalPages}
          </div>
        ) : null}
      </section>
    </aside>
  );
}

export default function WatchingContent() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN" || currentUser?.isForumAdmin;
  const { data: watchingData, isLoading: isWatchingLoading } = useWatchingDashboard(Boolean(isAdmin));
  const watchingMutation = useWatchingMutation();
  const [isRightOpen, setIsRightOpen] = useState(false);
  const [watchSearchQuery, setWatchSearchQuery] = useState("");
  const debouncedWatchSearch = useDebounce(watchSearchQuery, 300);
  const { data: watchSearchResults, isLoading: isWatchSearchLoading } = useSearch({
    query: debouncedWatchSearch,
    type: "all",
    page: 1,
  });
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const composeWrapRef = useRef<HTMLDivElement>(null);
  const [selectedPick, setSelectedPick] = useState<{
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string | null;
    backdropPath: string | null;
  } | null>(null);
  const [thoughtText, setThoughtText] = useState("");
  const [spoilerMode, setSpoilerMode] = useState(false);
  const [showAllWatchingNow, setShowAllWatchingNow] = useState(false);
  const [watchingNowPage, setWatchingNowPage] = useState(1);
  const [showAllJustFinished, setShowAllJustFinished] = useState(false);
  const [justFinishedPage, setJustFinishedPage] = useState(1);
  const [watchMomentLabel, setWatchMomentLabel] = useState(() => {
    const now = new Date();
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now);
    const h = now.getHours();
    const part = h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night";
    return `${weekday} ${part}`;
  });

  useEffect(() => {
    const sync = () => setIsRightOpen(window.innerWidth >= 1280);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now);
      const h = now.getHours();
      const part = h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night";
      setWatchMomentLabel(`${weekday} ${part}`);
    };
    tick();
    const t = window.setInterval(tick, 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!suggestionsOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!composeWrapRef.current?.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [suggestionsOpen]);

  const watchingNow = useMemo(
    () => (watchingData?.watchingNow ?? []).map(toFeedCard),
    [watchingData?.watchingNow]
  );
  const justFinished = useMemo(
    () => (watchingData?.justFinished ?? []).map(toFeedCard),
    [watchingData?.justFinished]
  );
  const WATCHING_NOW_PAGE_SIZE = 10;
  const JUST_FINISHED_PAGE_SIZE = 10;
  const watchingNowTotalPages = Math.max(1, Math.ceil(watchingNow.length / WATCHING_NOW_PAGE_SIZE));
  const justFinishedTotalPages = Math.max(1, Math.ceil(justFinished.length / JUST_FINISHED_PAGE_SIZE));
  const visibleWatchingNow = useMemo(() => {
    if (!showAllWatchingNow) return watchingNow.slice(0, 3);
    const start = (watchingNowPage - 1) * WATCHING_NOW_PAGE_SIZE;
    return watchingNow.slice(start, start + WATCHING_NOW_PAGE_SIZE);
  }, [showAllWatchingNow, watchingNow, watchingNowPage]);
  const visibleJustFinished = useMemo(() => {
    if (!showAllJustFinished) return justFinished.slice(0, 3);
    const start = (justFinishedPage - 1) * JUST_FINISHED_PAGE_SIZE;
    return justFinished.slice(start, start + JUST_FINISHED_PAGE_SIZE);
  }, [showAllJustFinished, justFinished, justFinishedPage]);

  useEffect(() => {
    if (!showAllWatchingNow) {
      setWatchingNowPage(1);
      return;
    }
    setWatchingNowPage((page) => Math.min(page, watchingNowTotalPages));
  }, [showAllWatchingNow, watchingNowTotalPages]);

  useEffect(() => {
    if (!showAllJustFinished) {
      setJustFinishedPage(1);
      return;
    }
    setJustFinishedPage((page) => Math.min(page, justFinishedTotalPages));
  }, [showAllJustFinished, justFinishedTotalPages]);

  const submitStartWatching = async () => {
    if (!selectedPick) {
      toast.error("Search and pick a movie or TV show to start.");
      return;
    }

    try {
      await watchingMutation.mutateAsync({
        action: "start",
        tmdbId: selectedPick.tmdbId,
        mediaType: selectedPick.mediaType,
        title: selectedPick.title,
        posterPath: selectedPick.posterPath,
        backdropPath: selectedPick.backdropPath,
      });
      toast.success("Watching session started.");
      setWatchSearchQuery("");
      setSelectedPick(null);
      setThoughtText("");
      setSpoilerMode(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start session");
    }
  };

  const submitShareThought = async () => {
    const sessionId = watchingData?.currentSession?.id;
    if (!sessionId || !thoughtText.trim()) return;
    try {
      await watchingMutation.mutateAsync({
        action: "share_thought",
        sessionId,
        content: thoughtText.trim(),
        spoiler: spoilerMode,
      });
      setThoughtText("");
      setSpoilerMode(false);
      toast.success("Thought shared.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to share thought");
    }
  };

  if (isLoading || (isAdmin && isWatchingLoading)) {
    return (
      <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-10 w-72" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,8fr)_1px_minmax(0,4fr)]">
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-xl border-border/70">
          <CardHeader>
            <p className="text-lg font-semibold">Watching is in admin beta</p>
            <p className="text-sm text-muted-foreground">
              This page is currently available to admins only while we validate core interactions and relevance.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="cursor-pointer">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div
        className={cn(
          "grid min-h-[calc(100vh-6rem)] grid-cols-1",
          isRightOpen
            ? "xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]"
            : "xl:grid-cols-[minmax(0,1fr)]"
        )}
      >
        <main className="relative min-w-0 space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          {!isRightOpen ? (
            <button
              type="button"
              className="absolute right-2 top-0 hidden h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground xl:inline-flex"
              onClick={() => setIsRightOpen(true)}
              aria-label="Expand sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
          <div className="mb-4 flex flex-col items-start gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="mb-1 text-xl font-bold tracking-tight sm:mb-2 sm:text-2xl">What are you watching?</h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                See what your friends are watching right now · {watchMomentLabel}
              </p>
            </div>
          </div>

          <div
            ref={composeWrapRef}
            className="rounded-[15px] border border-border/60 bg-muted/25 p-4 dark:border-border/50 dark:bg-muted/15"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={currentUser?.avatarUrl ?? undefined} />
                <AvatarFallback>{(currentUser?.username || currentUser?.displayName || "U")[0]}</AvatarFallback>
              </Avatar>
              <div className="relative min-w-0 flex-1">
                <Input
                  value={watchSearchQuery}
                  onChange={(e) => {
                    const v = e.target.value;
                    setWatchSearchQuery(v);
                    setSuggestionsOpen(true);
                    if (selectedPick && v !== selectedPick.title) {
                      setSelectedPick(null);
                    }
                  }}
                  onFocus={() => setSuggestionsOpen(true)}
                  placeholder={`What are you watching right now, ${currentUser?.displayName || currentUser?.username || "there"}?`}
                  className="h-10 w-full border-0 bg-transparent px-0 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent"
                  autoComplete="off"
                />
                {suggestionsOpen && debouncedWatchSearch.trim() ? (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(400px,50vh)] overflow-y-auto rounded-lg border border-border bg-popover shadow-md scrollbar-thin">
                    {isWatchSearchLoading ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                    ) : watchSearchResults?.results && watchSearchResults.results.length > 0 ? (
                      <div className="p-2">
                        {watchSearchResults.results.map((item) => {
                          const isMovie = "title" in item;
                          const title = isMovie ? (item as TMDBMovie).title : (item as TMDBSeries).name;
                          const mediaType = isMovie ? "movie" : "tv";
                          const yearLabel = isMovie
                            ? (item as TMDBMovie).release_date?.slice(0, 4)
                            : (item as TMDBSeries).first_air_date?.slice(0, 4);
                          const typeLabel = isMovie ? "Movie" : "TV";
                          const poster = item.poster_path;
                          return (
                            <button
                              key={`${item.id}-${mediaType}`}
                              type="button"
                              className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left hover:bg-muted"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setSelectedPick({
                                  tmdbId: item.id,
                                  mediaType,
                                  title,
                                  posterPath: item.poster_path ?? null,
                                  backdropPath: item.backdrop_path ?? null,
                                });
                                setWatchSearchQuery(title);
                                setSuggestionsOpen(false);
                              }}
                            >
                              {poster ? (
                                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-muted">
                                  <Image
                                    src={getPosterUrl(poster, "w200")}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                    unoptimized
                                  />
                                </div>
                              ) : (
                                <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                                  N/A
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {typeLabel}
                                  {yearLabel ? ` · ${yearLabel}` : ""}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">No results found.</div>
                    )}
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                className="h-10 shrink-0 cursor-pointer rounded-[20px] px-4 text-[14px] whitespace-nowrap"
                onClick={submitStartWatching}
                disabled={watchingMutation.isPending || !selectedPick}
              >
                I&apos;m watching...
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2">
              {showAllWatchingNow ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAllWatchingNow(false)}
                  aria-label="Back to compact watching now view"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : null}
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                WATCHING NOW
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowAllWatchingNow(true)}
              disabled={watchingNow.length <= 3}
            >
              See all
            </Button>
          </div>

          {visibleWatchingNow.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
          {!watchingNow.length ? <p className="text-sm text-muted-foreground">No one in your network is watching right now.</p> : null}

          {showAllWatchingNow && watchingNowTotalPages > 1 ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 cursor-pointer text-xs"
                onClick={() => setWatchingNowPage((page) => Math.max(1, page - 1))}
                disabled={watchingNowPage === 1}
              >
                Previous
              </Button>
              <p className="text-xs text-muted-foreground">
                Page {watchingNowPage} of {watchingNowTotalPages}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-8 cursor-pointer text-xs"
                onClick={() => setWatchingNowPage((page) => Math.min(watchingNowTotalPages, page + 1))}
                disabled={watchingNowPage === watchingNowTotalPages}
              >
                Next
              </Button>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2">
              {showAllJustFinished ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAllJustFinished(false)}
                  aria-label="Back to compact just finished view"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : null}
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">JUST FINISHED</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowAllJustFinished(true)}
              disabled={justFinished.length <= 3}
            >
              See all
            </Button>
          </div>

          {visibleJustFinished.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
          {!justFinished.length ? <p className="text-sm text-muted-foreground">No recent finishes yet.</p> : null}

          {showAllJustFinished && justFinishedTotalPages > 1 ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 cursor-pointer text-xs"
                onClick={() => setJustFinishedPage((page) => Math.max(1, page - 1))}
                disabled={justFinishedPage === 1}
              >
                Previous
              </Button>
              <p className="text-xs text-muted-foreground">
                Page {justFinishedPage} of {justFinishedTotalPages}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-8 cursor-pointer text-xs"
                onClick={() => setJustFinishedPage((page) => Math.min(justFinishedTotalPages, page + 1))}
                disabled={justFinishedPage === justFinishedTotalPages}
              >
                Next
              </Button>
            </div>
          ) : null}
        </main>

        {isRightOpen ? (
          <aside className="relative hidden border-l border-border/70 bg-muted/20 lg:block dark:bg-muted/10">
            <button
              type="button"
              className="absolute -left-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setIsRightOpen(false)}
              aria-label="Collapse sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <RightRail
              currentSession={watchingData?.currentSession ?? null}
              alsoWatchingCurrent={watchingData?.alsoWatchingCurrent ?? []}
              watchingNow={watchingData?.watchingNow ?? []}
              justFinished={watchingData?.justFinished ?? []}
              trendingTonight={watchingData?.trendingTonight ?? []}
              currentUserId={currentUser?.id}
              thoughtText={thoughtText}
              onThoughtTextChange={setThoughtText}
              spoilerMode={spoilerMode}
              onSpoilerModeChange={setSpoilerMode}
              onShareThought={submitShareThought}
              onChangeTitle={() => {
                setIsRightOpen(false);
                setSuggestionsOpen(true);
                composeWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                toast.message("Use the top search box to change your current title.");
              }}
              onUseTrendingItem={(item) => {
                setSelectedPick({
                  tmdbId: item.tmdbId,
                  mediaType: item.mediaType,
                  title: item.title,
                  posterPath: item.posterPath,
                  backdropPath: null,
                });
                setWatchSearchQuery(item.title);
                setSuggestionsOpen(false);
                toast.message("Loaded trending title — tap I'm watching... when ready.");
              }}
              isSubmitting={watchingMutation.isPending}
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

