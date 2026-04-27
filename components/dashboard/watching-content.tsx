"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  ListPlus,
  MessageSquare,
  Minus,
  Pause,
  PlayCircle,
  Plus,
  MoreHorizontal,
  Reply,
  Square,
  Smile,
  Pencil,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  useAddWatchingThoughtReply,
  useDeleteWatchingThought,
  useDeleteWatchingThoughtReply,
  useUpdateWatchingThought,
  useUpdateWatchingThoughtReply,
  useWatchingDashboard,
  useWatchingMutation,
  useWatchingThoughtReaction,
  useWatchingThoughtReplies,
} from "@/hooks/use-watching";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { useJustWatchCountries, useWatchProviders } from "@/hooks/use-content-details";
import { useSearch } from "@/hooks/use-search";
import { useToggleWatchlist } from "@/hooks/use-watchlist";
import type { WatchingSessionDTO } from "@/lib/watching-types";
import { getPosterUrl, type TMDBMovie, type TMDBSeries } from "@/lib/tmdb";
import WatchBreakdownSection from "@/components/content-detail/watch-breakdown-section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { moderateContent } from "@/lib/moderation";
import { toast } from "sonner";

type WatchingFeedCard = {
  id: string;
  userId: string;
  startedAt: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  backdropPath: string | null;
  primaryThoughtId: string | null;
  user: string;
  avatar?: string | null;
  status: "watching" | "finished";
  title: string;
  mediaTypeLabel: "Movie" | "TV";
  seasonNumber: number | null;
  episodeNumber: number | null;
  detailLine: string;
  posterPath: string | null;
  thought?: string;
  comments: Array<{
    id: string;
    userId: string;
    content: string;
    isSpoiler: boolean;
    createdAt: string;
    user: string;
    avatar: string | null;
    reactionCount: number;
    replyCount: number;
    myReactions: string[];
    sessionStatus: "WATCHING_NOW" | "JUST_FINISHED" | "STOPPED";
  }>;
  startedOrFinished: string;
  reactions: number;
  replies: number;
  primaryThoughtMyReactions: string[];
  progressPercent: number | null;
  runtimeMinutes: number | null;
};

type WatchingNowRoomCard = {
  key: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  mediaTypeLabel: "Movie" | "TV";
  seasonNumber: number | null;
  episodeNumber: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
  creatorOrDirector: string | null;
  watchingCount: number;
  participants: Array<{
    userId: string;
    name: string;
    avatar: string | null;
  }>;
  featuredThought: WatchingFeedCard["comments"][number] | null;
  thoughts: WatchingFeedCard["comments"];
  thoughtCount: number;
  reactionCount: number;
  primaryThoughtId: string | null;
  currentUserSession: {
    sessionId: string;
    startedAt: string;
    mediaType: "movie" | "tv";
    status: WatchingSessionDTO["status"];
    progressPercent: number | null;
    runtimeMinutes: number | null;
  } | null;
  currentUserFinishedAt: string | null;
};

type JustFinishedRoomCard = {
  key: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  mediaTypeLabel: "Movie" | "TV";
  seasonNumber: number | null;
  episodeNumber: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
  creatorOrDirector: string | null;
  finishedCount: number;
  participants: Array<{
    userId: string;
    name: string;
    avatar: string | null;
  }>;
  thoughts: WatchingFeedCard["comments"];
  reactionCount: number;
  currentUserSession: {
    sessionId: string;
    startedAt: string;
    mediaType: "movie" | "tv";
    status: WatchingSessionDTO["status"];
    progressPercent: number | null;
    runtimeMinutes: number | null;
  } | null;
};

const COMMENT_EMOJI_REACTIONS = ["like", "🔥", "😂", "😮", "😭"] as const;
const validateWatchingTextInput = (value: string) => {
  const moderation = moderateContent(value, {
    minLength: 1,
    maxLength: 1000,
    allowProfanity: false,
    sanitizeHtml: false,
  });
  return moderation.allowed ? null : moderation.error || "Content does not meet guidelines.";
};

const timeAgo = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const secs = Math.max(1, Math.round(ms / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
};

const titlePageHref = (mediaType: "movie" | "tv", tmdbId: number, title: string) => {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return `/${mediaType}/${tmdbId}/${slug || "title"}`;
};

const resolveTmdbImageSrc = (
  primary: string | null,
  fallback: string | null,
  size: "w200" | "w300" | "w500" | "w780" | "original" = "w200"
) => {
  const pick = [primary, fallback].find((value) => {
    if (!value) return false;
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === "n/a") return false;
    return true;
  });

  if (!pick) return getPosterUrl(null, size);
  if (pick.startsWith("http://") || pick.startsWith("https://")) return pick;
  if (pick.startsWith("/")) return getPosterUrl(pick, size);
  return getPosterUrl(null, size);
};

const toFeedCard = (session: WatchingSessionDTO): WatchingFeedCard => {
  const userLabel = session.user.displayName || session.user.username || "Unknown user";
  const isWatching = session.status === "WATCHING_NOW";
  const thought = session.thoughts[0]?.content;
  const mappedComments = session.thoughts.slice(1).map((entry) => ({
    id: entry.id,
    userId: entry.user.id,
    content: entry.content,
    isSpoiler: entry.isSpoiler,
    createdAt: entry.createdAt,
    user: entry.user.displayName || entry.user.username || "Unknown",
    avatar: entry.user.avatarUrl ?? null,
    reactionCount: entry.reactionCount ?? 0,
    replyCount: entry.replyCount ?? 0,
    myReactions: entry.myReactions ?? [],
    sessionStatus: session.status,
  }));
  const comments = mappedComments;
  return {
    id: session.id,
    userId: session.userId,
    startedAt: session.startedAt,
    tmdbId: session.tmdbId,
    mediaType: session.mediaType,
    backdropPath: session.backdropPath,
    primaryThoughtId: session.thoughts[0]?.id ?? null,
    user: userLabel,
    avatar: session.user.avatarUrl,
    status: isWatching ? "watching" : "finished",
    title: session.title,
    mediaTypeLabel: session.mediaType === "movie" ? "Movie" : "TV",
    seasonNumber: session.seasonNumber ?? null,
    episodeNumber: session.episodeNumber ?? null,
    detailLine: isWatching
      ? `${session.releaseYear ?? "Year unknown"} · ${session.creatorOrDirector ?? "Creator unknown"}${
          session.mediaType === "tv" && session.seasonNumber && session.episodeNumber
            ? ` · S${String(session.seasonNumber).padStart(2, "0")}E${String(session.episodeNumber).padStart(2, "0")}`
            : ""
        } · ${Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000))} min in`
      : `${session.releaseYear ?? "Year unknown"} · ${session.creatorOrDirector ?? "Creator unknown"}${
          session.mediaType === "tv" && session.seasonNumber && session.episodeNumber
            ? ` · S${String(session.seasonNumber).padStart(2, "0")}E${String(session.episodeNumber).padStart(2, "0")}`
            : ""
        } · wrapped ${timeAgo(session.endedAt || session.updatedAt)}`,
    posterPath: session.posterPath,
    thought,
    comments,
    startedOrFinished: isWatching
      ? `Started ${timeAgo(session.startedAt)}`
      : `Finished ${timeAgo(session.endedAt || session.updatedAt)}`,
    reactions: session.thoughts[0]?.reactionCount ?? 0,
    replies: session.thoughts.length,
    primaryThoughtMyReactions: session.thoughts[0]?.myReactions ?? [],
    progressPercent: session.progressPercent ?? null,
    runtimeMinutes: session.runtimeMinutes ?? null,
  };
};

function JustFinishedComment({
  comment,
  showBorder,
  parentThoughtId,
  currentUserId,
  onReactionDelta,
}: {
  comment: WatchingFeedCard["comments"][number];
  showBorder: boolean;
  parentThoughtId?: string | null;
  currentUserId?: string | null;
  onReactionDelta?: (delta: number) => void;
}) {
  const [isSpoilerRevealed, setIsSpoilerRevealed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [localReactionCount, setLocalReactionCount] = useState(comment.reactionCount);
  const [localMyReactions, setLocalMyReactions] = useState<string[]>(comment.myReactions ?? []);
  const [editText, setEditText] = useState(comment.content);
  const [isEditing, setIsEditing] = useState(false);
  const [replyEditState, setReplyEditState] = useState<{ id: string; content: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "thought" | "reply"; id: string } | null>(null);
  const thoughtIdForThread = parentThoughtId ?? comment.id;
  const { data: replies } = useWatchingThoughtReplies(thoughtIdForThread, true);
  const addReply = useAddWatchingThoughtReply();
  const { addMutation, removeMutation } = useWatchingThoughtReaction();
  const updateThoughtMutation = useUpdateWatchingThought();
  const deleteThoughtMutation = useDeleteWatchingThought();
  const updateReplyMutation = useUpdateWatchingThoughtReply();
  const deleteReplyMutation = useDeleteWatchingThoughtReply();

  useEffect(() => {
    setLocalReactionCount(comment.reactionCount);
    setLocalMyReactions(comment.myReactions ?? []);
    setEditText(comment.content);
  }, [comment.reactionCount, comment.myReactions]);
  const canManageComment = !!currentUserId && comment.userId === currentUserId;

  const submitReply = async () => {
    const text = replyText.trim();
    if (!text) return;
    const validationError = validateWatchingTextInput(text);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      await addReply.mutateAsync({
        thoughtId: thoughtIdForThread,
        content: text,
        parentReplyId: replyParentId,
      });
      setReplyText("");
      setIsReplying(false);
      setReplyParentId(null);
      toast.success("Reply posted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post reply");
    }
  };

  const handleReactionToggle = async (reactionType: string) => {
    const previousReactions = [...localMyReactions];
    const hasReaction = previousReactions.includes(reactionType);
    const delta = hasReaction ? -1 : 1;
    setLocalMyReactions((prev) =>
      hasReaction ? prev.filter((reaction) => reaction !== reactionType) : [...prev, reactionType]
    );
    setLocalReactionCount((count) => Math.max(0, count + delta));
    onReactionDelta?.(delta);
    try {
      if (hasReaction) {
        await removeMutation.mutateAsync({ thoughtId: comment.id, reactionType });
      } else {
        await addMutation.mutateAsync({ thoughtId: comment.id, reactionType });
      }
    } catch (error) {
      setLocalMyReactions(previousReactions);
      setLocalReactionCount((count) => Math.max(0, count - delta));
      onReactionDelta?.(-delta);
      toast.error(error instanceof Error ? error.message : "Failed to update reaction");
    }
  };
  const repliesByParent = useMemo(() => {
    const map = new Map<string, NonNullable<typeof replies>>();
    for (const reply of replies ?? []) {
      const key = reply.parentReplyId ?? "root";
      const list = map.get(key) ?? [];
      list.push(reply);
      map.set(key, list);
    }
    return map;
  }, [replies]);
  // Top-level replies to a thought are stored with parentReplyId = null ("root").
  // This component always renders a thought thread, so read root replies here.
  const primaryReplies = (repliesByParent.get("root") ?? []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const totalReplies = Math.max(comment.replyCount, replies?.length ?? 0);
  const isLive = comment.sessionStatus === "WATCHING_NOW";

  const submitThoughtEdit = async () => {
    const content = editText.trim();
    if (!content) return;
    const validationError = validateWatchingTextInput(content);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      await updateThoughtMutation.mutateAsync({ thoughtId: comment.id, content });
      setIsEditing(false);
      toast.success("Comment updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update comment");
    }
  };

  const submitReplyEdit = async () => {
    if (!replyEditState) return;
    const content = replyEditState.content.trim();
    if (!content) return;
    const validationError = validateWatchingTextInput(content);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      await updateReplyMutation.mutateAsync({
        thoughtId: thoughtIdForThread,
        replyId: replyEditState.id,
        content,
      });
      setReplyEditState(null);
      toast.success("Reply updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update reply");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "thought") {
        await deleteThoughtMutation.mutateAsync({ thoughtId: comment.id });
        toast.success("Comment deleted.");
      } else {
        await deleteReplyMutation.mutateAsync({
          thoughtId: thoughtIdForThread,
          replyId: deleteTarget.id,
        });
        toast.success("Reply deleted.");
      }
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete item");
    }
  };

  return (
    <div className={cn("px-[14px] py-[13px]", showBorder ? "border-b border-border/60 dark:border-border/50" : "")}>
      <div className="flex items-start gap-[10px]">
        <Avatar className="mt-0.5 h-7 w-7 shrink-0">
          <AvatarImage src={comment.avatar ?? undefined} alt={comment.user} />
          <AvatarFallback>{comment.user[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 min-w-0 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className="truncate text-[13px] font-medium text-foreground">{comment.user}</span>
            <span>·</span>
            <span>{timeAgo(comment.createdAt)}</span>
            <span>·</span>
            {isLive ? (
              <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Live
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                Finished
              </span>
            )}
            {canManageComment ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-6 w-6 cursor-pointer rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => {
                      setIsEditing(true);
                      setEditText(comment.content);
                    }}
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => setDeleteTarget({ type: "thought", id: comment.id })}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          {comment.isSpoiler ? (
            <div className="mb-1.5">
              <Badge variant="secondary" className="rounded-full bg-amber-500/15 text-[10px] text-amber-600 dark:text-amber-400">
                Spoiler discussion
              </Badge>
            </div>
          ) : null}
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-[72px] border-border/60 bg-transparent text-[13px] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={submitThoughtEdit}
                  disabled={updateThoughtMutation.isPending || !editText.trim()}
                  className="h-8 cursor-pointer rounded-[20px] px-3 text-xs"
                >
                  {updateThoughtMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(comment.content);
                  }}
                  className="h-8 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsSpoilerRevealed(true)}
              className={cn(
                "w-full cursor-pointer text-left text-[13px] transition",
                comment.isSpoiler && !isSpoilerRevealed
                  ? "select-none text-transparent [text-shadow:0_0_8px_rgba(148,163,184,0.95)]"
                  : "text-foreground"
              )}
            >
              {comment.isSpoiler && !isSpoilerRevealed ? "Tap to reveal spoiler comment" : comment.content}
            </button>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowReactionPicker((v) => !v)}
          disabled={addMutation.isPending || removeMutation.isPending}
              className="h-7 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              <Smile className="h-3.5 w-3.5" />
              {localReactionCount}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsReplying((v) => !v);
                setReplyParentId(null);
                if (isReplying) {
                  setReplyText("");
                }
              }}
              className="h-7 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              <Reply className="h-3.5 w-3.5" />
              Reply ({totalReplies})
            </Button>
          </div>
          {showReactionPicker ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {COMMENT_EMOJI_REACTIONS.map((reactionType) => {
                const selected = localMyReactions.includes(reactionType);
                return (
                  <button
                    key={reactionType}
                    type="button"
                    className={`h-7 rounded-[20px] border border-border/60 px-3 text-xs font-medium cursor-pointer ${
                      selected ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"
                    }`}
                    onClick={() => handleReactionToggle(reactionType)}
                disabled={addMutation.isPending || removeMutation.isPending}
                  >
                    {reactionType === "like" ? "👍" : reactionType}
                  </button>
                );
              })}
              {localMyReactions.length > 0 ? (
                <span className="text-[11px] text-muted-foreground">
                  You reacted:{" "}
                  {localMyReactions
                    .map((reaction) => (reaction === "like" ? "👍" : reaction))
                    .join(" ")}
                </span>
              ) : null}
            </div>
          ) : null}
          {isReplying ? (
            <div className="mt-2 flex items-center gap-2">
              <Input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
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
                {addReply.isPending ? "Sending..." : "Send"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsReplying(false);
                  setReplyParentId(null);
                  setReplyText("");
                }}
                className="h-8 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs text-muted-foreground hover:bg-muted"
              >
                Cancel
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      {primaryReplies.length ? (
        <div className="mt-2 ml-[38px] space-y-2 border-l border-border/50 pl-3">
          {primaryReplies.map((reply) => {
            const replyUser = reply.user.displayName || reply.user.username || "Someone";
            const nestedReplies = (repliesByParent.get(reply.id) ?? []).slice(0, 2);
            return (
              <div key={reply.id} className="flex items-start gap-[10px]">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={reply.user.avatarUrl ?? undefined} alt={replyUser} />
                  <AvatarFallback>{replyUser[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                    <span className="truncate text-[13px] font-medium text-foreground">{replyUser}</span>
                    <span>·</span>
                    <span>{timeAgo(reply.createdAt)}</span>
                    {currentUserId && reply.user.id === currentUserId ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="ml-1 h-6 w-6 cursor-pointer rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => setReplyEditState({ id: reply.id, content: reply.content })}
                          >
                            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget({ type: "reply", id: reply.id })}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                  {replyEditState?.id === reply.id ? (
                    <div className="space-y-2">
                      <Input
                        value={replyEditState.content}
                        onChange={(e) => setReplyEditState({ id: reply.id, content: e.target.value })}
                        className="h-8 border-border/60 bg-transparent text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={submitReplyEdit}
                          disabled={updateReplyMutation.isPending || !replyEditState.content.trim()}
                          className="h-7 cursor-pointer rounded-[20px] px-3 text-xs"
                        >
                          {updateReplyMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyEditState(null)}
                          className="h-7 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs text-muted-foreground hover:bg-muted"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[13px] text-foreground">{reply.content}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowReactionPicker((v) => !v)}
                      className="h-7 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
                    >
                      <Smile className="h-3.5 w-3.5" />
                      {localReactionCount}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsReplying(true);
                        setReplyText(`@${replyUser} `);
                        setReplyParentId(reply.id);
                      }}
                      className="h-7 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
                    >
                      <Reply className="h-3.5 w-3.5" />
                      Reply ({nestedReplies.length})
                    </Button>
                  </div>
                  {nestedReplies.length ? (
                    <div className="space-y-1.5 pt-1">
                      {nestedReplies.map((nested) => {
                        const nestedUser = nested.user.displayName || nested.user.username || "Someone";
                        return (
                          <div key={nested.id} className="space-y-0.5 text-[12px]">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <span className="font-medium text-foreground">{nestedUser}</span>
                              <span>·</span>
                              <span>{timeAgo(nested.createdAt)}</span>
                            </div>
                            <p className="text-[13px] text-foreground">{nested.content}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          {totalReplies > primaryReplies.length ? (
            <p className="text-[11px] text-muted-foreground">+{totalReplies - primaryReplies.length} more replies</p>
          ) : null}
        </div>
      ) : null}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "reply" ? "reply" : "comment"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              {(deleteThoughtMutation.isPending || deleteReplyMutation.isPending) ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FeedCard({
  item,
  currentUserId,
  isSelected,
  onSelect,
}: {
  item: WatchingFeedCard;
  currentUserId?: string | null;
  isSelected?: boolean;
  onSelect?: (item: WatchingFeedCard) => void;
}) {
  const [expandedComments, setExpandedComments] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [localReactions, setLocalReactions] = useState(item.reactions);
  const [localLiked, setLocalLiked] = useState(item.primaryThoughtMyReactions.includes("like"));
  const [localReplies, setLocalReplies] = useState(item.replies);
  const [optimisticInWatchlist, setOptimisticInWatchlist] = useState<boolean | null>(null);
  const addReply = useAddWatchingThoughtReply();
  const { addMutation, removeMutation } = useWatchingThoughtReaction();
  const { data: primaryThoughtReplies } = useWatchingThoughtReplies(item.primaryThoughtId ?? "", Boolean(item.primaryThoughtId));
  const watchingMutation = useWatchingMutation();
  const { toggle: toggleWatchlist, isLoading: isWatchlistMutating, isInWatchlist } = useToggleWatchlist();
  const actualInWatchlist = isInWatchlist(item.tmdbId, item.mediaType);
  const inWatchlist = optimisticInWatchlist ?? actualInWatchlist;
  const canControlPlayback = item.status === "watching" && item.userId === currentUserId;
  const playbackBusy = watchingMutation.isPending;
  const elapsedMinutes = Math.max(1, Math.round((Date.now() - new Date(item.startedAt).getTime()) / 60000));
  const movieRuntime = item.mediaType === "movie" ? item.runtimeMinutes : null;
  const isMovieFinishLocked = canControlPlayback && item.mediaType === "movie" && movieRuntime != null && elapsedMinutes < movieRuntime;
  const replyBlocksFromPrimaryThought = useMemo(() => {
    if (!item.primaryThoughtId || !primaryThoughtReplies?.length) return [];
    return primaryThoughtReplies
      .filter((reply) => !reply.parentReplyId)
      .map((reply) => ({
        id: reply.id,
        userId: reply.user.id,
        content: reply.content,
        isSpoiler: false,
        createdAt: reply.createdAt,
        user: reply.user.displayName || reply.user.username || "Unknown",
        avatar: reply.user.avatarUrl ?? null,
        reactionCount: 0,
        replyCount: 0,
        myReactions: [],
        sessionStatus: (item.status === "watching" ? "WATCHING_NOW" : "JUST_FINISHED") as "WATCHING_NOW" | "JUST_FINISHED",
      }));
  }, [item.primaryThoughtId, item.status, primaryThoughtReplies]);
  const commentBlocks = replyBlocksFromPrimaryThought;
  const visibleComments = expandedComments ? commentBlocks : commentBlocks.slice(0, 10);
  const hasMoreComments = commentBlocks.length > 10;

  useEffect(() => {
    setOptimisticInWatchlist(null);
  }, [actualInWatchlist, item.tmdbId, item.mediaType]);

  useEffect(() => {
    setLocalReactions(item.reactions);
    setLocalLiked(item.primaryThoughtMyReactions.includes("like"));
  }, [item.reactions, item.primaryThoughtMyReactions]);

  const handleCardLikeToggle = async () => {
    if (!item.primaryThoughtId) {
      toast.message("No thought yet to react to.");
      return;
    }
    const wasLiked = localLiked;
    setLocalLiked(!wasLiked);
    setLocalReactions((count) => Math.max(0, wasLiked ? count - 1 : count + 1));
    try {
      if (wasLiked) {
        await removeMutation.mutateAsync({ thoughtId: item.primaryThoughtId, reactionType: "like" });
      } else {
        await addMutation.mutateAsync({ thoughtId: item.primaryThoughtId, reactionType: "like" });
      }
    } catch (error) {
      setLocalLiked(wasLiked);
      setLocalReactions((count) => Math.max(0, wasLiked ? count + 1 : count - 1));
      toast.error(error instanceof Error ? error.message : "Failed to react");
    }
  };

  const handleCardReply = async () => {
    const content = replyText.trim();
    if (!item.primaryThoughtId || !content) return;
    const validationError = validateWatchingTextInput(content);
    if (validationError) {
      toast.error(validationError);
      return;
    }
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
    const next = !inWatchlist;
    setOptimisticInWatchlist(next);
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
      setOptimisticInWatchlist((prev) => (prev == null ? null : !prev));
      toast.error(error instanceof Error ? error.message : "Failed to update watchlist");
    }
  };

  const handlePlaybackStart = async () => {
    if (!canControlPlayback) return;
    try {
      const nextProgress = Math.max(1, Math.min(99, item.progressPercent ?? 1));
      await watchingMutation.mutateAsync({
        action: "update_progress",
        sessionId: item.id,
        progressPercent: nextProgress,
      });
      toast.success("Playback active.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resume playback");
    }
  };

  const handlePlaybackPause = async () => {
    if (!canControlPlayback) return;
    try {
      await watchingMutation.mutateAsync({
        action: "stop",
        sessionId: item.id,
      });
      toast.success("Session paused.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to pause session");
    }
  };

  const handlePlaybackFinish = async () => {
    if (!canControlPlayback) return;
    if (isMovieFinishLocked && movieRuntime != null) {
      const remaining = Math.max(1, movieRuntime - elapsedMinutes);
      toast.message(`You can mark finished in about ${remaining} min.`);
      return;
    }
    try {
      await watchingMutation.mutateAsync({
        action: "finish",
        sessionId: item.id,
      });
      toast.success("Marked as finished.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to finish session");
    }
  };

  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden rounded-[15px] border border-border/60 bg-muted/25 p-0 transition dark:border-border/50 dark:bg-muted/15",
        isSelected ? "ring-2 ring-primary/35 border-primary/40" : "hover:ring-1 hover:ring-primary/20"
      )}
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(item);
        }
      }}
    >
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
          <Link href={titlePageHref(item.mediaType, item.tmdbId, item.title)} className="shrink-0">
            <div className="relative h-16 w-12 overflow-hidden rounded-md bg-muted">
              <Image
                src={resolveTmdbImageSrc(item.posterPath, item.backdropPath, "w200")}
                alt=""
                fill
                className="object-cover"
                sizes="48px"
                unoptimized
              />
            </div>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={titlePageHref(item.mediaType, item.tmdbId, item.title)}
                className="truncate text-sm font-medium hover:underline"
              >
                {item.title}
              </Link>
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {item.mediaTypeLabel}
              </Badge>
            </div>
            <p className="line-clamp-1 text-xs text-muted-foreground">{item.detailLine}</p>
            {canControlPlayback ? (
              <div className="mt-2 flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-pointer rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  onClick={handlePlaybackStart}
                  disabled={playbackBusy}
                  aria-label="Start playback"
                  title="Start playback"
                >
                  <PlayCircle className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-pointer rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  onClick={handlePlaybackPause}
                  disabled={playbackBusy}
                  aria-label="Pause session"
                  title="Pause session"
                >
                  <Pause className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-pointer rounded-full text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-500"
                  onClick={handlePlaybackFinish}
                  disabled={playbackBusy || isMovieFinishLocked}
                  aria-label="Stop and mark finished"
                  title={
                    isMovieFinishLocked && movieRuntime != null
                      ? `Finish available after runtime (${movieRuntime} min)`
                      : "Stop and mark finished"
                  }
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
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
          commentBlocks.length > 0 || isReplying ? "border-b border-border/60 dark:border-border/50" : ""
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCardLikeToggle}
          disabled={(addMutation.isPending && !localLiked) || (removeMutation.isPending && localLiked) || !item.primaryThoughtId}
          className="h-10 cursor-pointer justify-center gap-1.5 rounded-none text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          <ThumbsUp className={cn("h-3.5 w-3.5", localLiked ? "fill-yellow-400 text-yellow-400" : "")} /> {localReactions}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsReplying((v) => !v)}
          disabled={!item.primaryThoughtId}
          className="h-10 cursor-pointer justify-center gap-1.5 rounded-none text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          <Reply className="h-3.5 w-3.5" /> {localReplies} replies
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleWatchlistToggle}
          disabled={isWatchlistMutating}
          className="h-10 cursor-pointer justify-center gap-1.5 rounded-none text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          <Bookmark className={cn("h-3.5 w-3.5", inWatchlist ? "text-yellow-400 fill-yellow-400" : "")} /> Watchlist
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
              {addReply.isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      ) : null}

      {commentBlocks.length > 0 ? (
        <div className="p-0">
          {visibleComments.map((comment, index) => {
            const showBorder = index < visibleComments.length - 1 || hasMoreComments;
            return (
              <JustFinishedComment
                key={comment.id}
                comment={comment}
                showBorder={showBorder}
                parentThoughtId={item.primaryThoughtId}
                currentUserId={currentUserId}
                onReactionDelta={(delta) => {
                  setLocalReactions((count) => Math.max(0, count + delta));
                }}
              />
            );
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
                {expandedComments ? "Show less" : `Show more (${commentBlocks.length - 10})`}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function WatchingNowGroupCard({
  room,
  onJoinRoom,
  onSelect,
  currentUserId,
  onWatchNow,
  isJoiningRoom,
}: {
  room: WatchingNowRoomCard;
  onJoinRoom: (room: WatchingNowRoomCard) => Promise<void>;
  onSelect?: (room: WatchingNowRoomCard) => void;
  currentUserId?: string | null;
  onWatchNow?: (room: { tmdbId: number; mediaType: "movie" | "tv"; title: string }) => void;
  isJoiningRoom?: boolean;
}) {
  const [showThoughts, setShowThoughts] = useState(false);
  const [showFinishOverrideDialog, setShowFinishOverrideDialog] = useState(false);
  const [localReactions, setLocalReactions] = useState(room.reactionCount ?? 0);
  const localLiked = Boolean(room.featuredThought?.myReactions?.includes("like"));
  const { toggle: toggleWatchlist, isLoading: isWatchlistMutating, isInWatchlist } = useToggleWatchlist();
  const watchingMutation = useWatchingMutation();
  const inWatchlist = isInWatchlist(room.tmdbId, room.mediaType);
  useEffect(() => {
    setLocalReactions(room.reactionCount ?? 0);
  }, [room.reactionCount]);

  const participantLabel = useMemo(() => {
    if (!room.participants.length) return "No participants yet";
    const names = room.participants.map((p) => p.name);
    if (names.length <= 2) return names.join(" and ");
    const first = names.slice(0, 3).join(", ");
    const remaining = names.length - 3;
    return remaining > 0 ? `${first} and ${remaining} others` : first;
  }, [room.participants]);
  const isCurrentUserInRoom = !!currentUserId && room.participants.some((participant) => participant.userId === currentUserId);
  const hasCurrentUserFinished = !isCurrentUserInRoom && !!room.currentUserFinishedAt;
  const canControlPlayback = Boolean(room.currentUserSession);
  const playbackBusy = watchingMutation.isPending;
  const elapsedMinutes = room.currentUserSession
    ? Math.max(1, Math.round((Date.now() - new Date(room.currentUserSession.startedAt).getTime()) / 60000))
    : 0;
  const runtimeMinutes = room.currentUserSession?.runtimeMinutes ?? null;
  const isFinishLocked = canControlPlayback && runtimeMinutes != null && runtimeMinutes > 0 && elapsedMinutes < runtimeMinutes;

  const handleWatchlistToggle = async () => {
    try {
      if (room.mediaType === "movie") {
        await toggleWatchlist(
          {
            id: room.tmdbId,
            title: room.title,
            overview: "",
            poster_path: room.posterPath ?? room.backdropPath ?? null,
            backdrop_path: room.backdropPath,
            release_date: "",
            vote_average: 0,
            vote_count: 0,
            genre_ids: [],
            popularity: 0,
            adult: false,
            original_language: "en",
            original_title: room.title,
          },
          "movie"
        );
      } else {
        await toggleWatchlist(
          {
            id: room.tmdbId,
            name: room.title,
            overview: "",
            poster_path: room.posterPath ?? room.backdropPath ?? null,
            backdrop_path: room.backdropPath,
            first_air_date: "",
            vote_average: 0,
            vote_count: 0,
            genre_ids: [],
            popularity: 0,
            original_language: "en",
            original_name: room.title,
          },
          "tv"
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update watchlist");
    }
  };

  const handlePlaybackToggle = async () => {
    if (!room.currentUserSession) return;
    try {
      await watchingMutation.mutateAsync({
        action: room.currentUserSession.status === "WATCHING_NOW" ? "stop" : "resume",
        sessionId: room.currentUserSession.sessionId,
      });
      toast.success(room.currentUserSession.status === "WATCHING_NOW" ? "Session paused." : "Session resumed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update session");
    }
  };

  const handlePlaybackFinish = async (force: boolean = false) => {
    if (!room.currentUserSession) return;
    if (!force && isFinishLocked && runtimeMinutes != null) {
      setShowFinishOverrideDialog(true);
      return;
    }
    try {
      await watchingMutation.mutateAsync({
        action: "finish",
        sessionId: room.currentUserSession.sessionId,
      });
      toast.success("Marked as finished.");
      setShowFinishOverrideDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to finish session");
    }
  };

  return (
    <Card
      className="gap-0 overflow-hidden rounded-[15px] border border-border/60 bg-muted/25 p-0 transition hover:ring-1 hover:ring-primary/20 dark:border-border/50 dark:bg-muted/15"
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(room)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(room);
        }
      }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-muted/35 px-[14px] py-[13px] dark:border-border/50 dark:bg-muted/20">
        <div className="flex min-w-0 items-start gap-3">
          <Link
            href={titlePageHref(room.mediaType, room.tmdbId, room.title)}
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-14 w-10 overflow-hidden rounded-md bg-muted">
              <Image
                src={resolveTmdbImageSrc(room.posterPath, room.backdropPath, "w200")}
                alt={`${room.title} poster`}
                fill
                className="object-cover"
                sizes="40px"
                unoptimized
              />
            </div>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={titlePageHref(room.mediaType, room.tmdbId, room.title)}
                className="truncate text-sm font-medium hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {room.title}
              </Link>
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {room.mediaTypeLabel}
              </Badge>
              {room.mediaType === "tv" && room.seasonNumber && room.episodeNumber ? (
                <Badge variant="secondary" className="rounded-full bg-primary/15 text-[10px] text-primary">
                  S{String(room.seasonNumber).padStart(2, "0")} · E{String(room.episodeNumber).padStart(2, "0")}
                </Badge>
              ) : null}
            </div>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {room.releaseYear ?? "Year unknown"} · {room.creatorOrDirector ?? "Creator unknown"}
            </p>
            {canControlPlayback ? (
              <div className="mt-2 flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-pointer rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handlePlaybackToggle();
                  }}
                  disabled={playbackBusy}
                  aria-label={room.currentUserSession.status === "WATCHING_NOW" ? "Pause session" : "Resume session"}
                >
                  {room.currentUserSession.status === "WATCHING_NOW" ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-pointer rounded-full text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handlePlaybackFinish(false);
                  }}
                  disabled={playbackBusy}
                  aria-label="Stop and mark finished"
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
        <p className="shrink-0 text-[12px] font-medium text-emerald-500">• {room.watchingCount} watching</p>
      </div>

      <div className="border-b border-border/60 bg-muted/30 px-[14px] py-[13px] dark:border-border/50 dark:bg-muted/20">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex -space-x-2">
              {room.participants.slice(0, 6).map((participant) => (
                <Avatar key={participant.userId} className="h-7 w-7 border border-background">
                  <AvatarImage src={participant.avatar ?? undefined} alt={participant.name} />
                  <AvatarFallback>{participant.name[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <p className="truncate text-[13px] text-muted-foreground">{participantLabel}</p>
            {hasCurrentUserFinished ? (
              <p className="mt-1 inline-flex items-center rounded-full border border-slate-500/25 bg-slate-500/15 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                You finished {timeAgo(room.currentUserFinishedAt ?? new Date().toISOString())}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (isCurrentUserInRoom) return;
              void onJoinRoom(room);
            }}
            disabled={isCurrentUserInRoom || isJoiningRoom}
            className="h-8 shrink-0 cursor-pointer rounded-[20px] border border-emerald-500/35 bg-emerald-500/15 px-3 text-xs text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
          >
            {isCurrentUserInRoom ? "In room" : isJoiningRoom ? "Joining..." : "Join room"}
          </Button>
        </div>
      </div>

      <div className="border-b border-border/60 px-[14px] py-[13px] dark:border-border/50">
        {room.featuredThought ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowThoughts((v) => !v);
            }}
            className="w-full cursor-pointer text-left"
          >
            <p className="text-[13px] italic text-muted-foreground">
              "{room.featuredThought.isSpoiler ? "Tap to reveal spoiler thought" : room.featuredThought.content}"
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {room.featuredThought.user} · {timeAgo(room.featuredThought.createdAt)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {Math.max(0, room.thoughtCount - 1)} more thoughts from this room
            </p>
          </button>
        ) : (
          <p className="text-[13px] text-muted-foreground">No thoughts yet.</p>
        )}
      </div>

      {showThoughts && room.thoughts.length ? (
        <div className="p-0">
          {room.thoughts.map((thought, index) => (
            <JustFinishedComment
              key={thought.id}
              comment={thought}
              showBorder={index < room.thoughts.length - 1}
              parentThoughtId={thought.id}
              currentUserId={currentUserId}
              onReactionDelta={(delta) => {
                setLocalReactions((count) => Math.max(0, count + delta));
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="border-t border-border/80">
        <div className="grid grid-cols-4 divide-x divide-border/60">
        <div className="inline-flex h-10 items-center justify-center gap-1.5 rounded-none text-xs text-muted-foreground">
          <Smile className={cn("h-3.5 w-3.5", localLiked ? "text-yellow-400" : "")} /> {localReactions}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowThoughts((v) => !v);
          }}
          className="h-10 cursor-pointer justify-center gap-1.5 rounded-none text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{room.thoughtCount}</span>
          <span className="hidden sm:inline">comments</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            void handleWatchlistToggle();
          }}
          disabled={isWatchlistMutating}
          className="h-10 cursor-pointer justify-center gap-1.5 rounded-none text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          <Bookmark className={cn("h-3.5 w-3.5", inWatchlist ? "text-yellow-400 fill-yellow-400" : "")} /> Watchlist
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onWatchNow?.({
              tmdbId: room.tmdbId,
              mediaType: room.mediaType,
              title: room.title,
            });
          }}
          className="h-10 cursor-pointer justify-center gap-1.5 rounded-none text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          <PlayCircle className="h-3.5 w-3.5" />
          <span>Watch Now</span>
        </Button>
        </div>
      </div>
      <AlertDialog open={showFinishOverrideDialog} onOpenChange={setShowFinishOverrideDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish before runtime ends?</AlertDialogTitle>
            <AlertDialogDescription>
              {runtimeMinutes != null
                ? `This title is around ${runtimeMinutes} min and you've watched about ${elapsedMinutes} min. You can still finish now if you ended early.`
                : "You can still finish now if you ended early."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Keep watching</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={() => {
                void handlePlaybackFinish(true);
              }}
            >
              Finish anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function JustFinishedGroupCard({
  room,
  onSelect,
  currentUserId,
  onWatchNow,
}: {
  room: JustFinishedRoomCard;
  onSelect?: (room: JustFinishedRoomCard) => void;
  currentUserId?: string | null;
  onWatchNow?: (room: { tmdbId: number; mediaType: "movie" | "tv"; title: string }) => void;
}) {
  const [showThoughts, setShowThoughts] = useState(true);
  const [showFinishOverrideDialog, setShowFinishOverrideDialog] = useState(false);
  const topAvatars = room.participants.slice(0, 6);
  const featuredThought = room.thoughts[0] ?? null;
  const [localReactions, setLocalReactions] = useState(room.reactionCount ?? 0);
  const localLiked = Boolean(featuredThought?.myReactions?.includes("like"));
  const { toggle: toggleWatchlist, isLoading: isWatchlistMutating, isInWatchlist } = useToggleWatchlist();
  const watchingMutation = useWatchingMutation();
  const inWatchlist = isInWatchlist(room.tmdbId, room.mediaType);
  useEffect(() => {
    setLocalReactions(room.reactionCount ?? 0);
  }, [room.reactionCount]);
  const canControlPlayback = Boolean(room.currentUserSession);
  const playbackBusy = watchingMutation.isPending;
  const elapsedMinutes = room.currentUserSession
    ? Math.max(1, Math.round((Date.now() - new Date(room.currentUserSession.startedAt).getTime()) / 60000))
    : 0;
  const runtimeMinutes = room.currentUserSession?.runtimeMinutes ?? null;
  const isFinishLocked = canControlPlayback && runtimeMinutes != null && runtimeMinutes > 0 && elapsedMinutes < runtimeMinutes;

  const handleWatchlistToggle = async () => {
    try {
      if (room.mediaType === "movie") {
        await toggleWatchlist(
          {
            id: room.tmdbId,
            title: room.title,
            overview: "",
            poster_path: room.posterPath ?? room.backdropPath ?? null,
            backdrop_path: room.backdropPath,
            release_date: "",
            vote_average: 0,
            vote_count: 0,
            genre_ids: [],
            popularity: 0,
            adult: false,
            original_language: "en",
            original_title: room.title,
          },
          "movie"
        );
      } else {
        await toggleWatchlist(
          {
            id: room.tmdbId,
            name: room.title,
            overview: "",
            poster_path: room.posterPath ?? room.backdropPath ?? null,
            backdrop_path: room.backdropPath,
            first_air_date: "",
            vote_average: 0,
            vote_count: 0,
            genre_ids: [],
            popularity: 0,
            original_language: "en",
            original_name: room.title,
          },
          "tv"
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update watchlist");
    }
  };

  const handlePlaybackToggle = async () => {
    if (!room.currentUserSession) return;
    try {
      await watchingMutation.mutateAsync({
        action: room.currentUserSession.status === "WATCHING_NOW" ? "stop" : "resume",
        sessionId: room.currentUserSession.sessionId,
      });
      toast.success(room.currentUserSession.status === "WATCHING_NOW" ? "Session paused." : "Session resumed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update session");
    }
  };

  const handlePlaybackFinish = async (force: boolean = false) => {
    if (!room.currentUserSession) return;
    if (!force && isFinishLocked && runtimeMinutes != null) {
      setShowFinishOverrideDialog(true);
      return;
    }
    try {
      await watchingMutation.mutateAsync({
        action: "finish",
        sessionId: room.currentUserSession.sessionId,
      });
      toast.success("Marked as finished.");
      setShowFinishOverrideDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to finish session");
    }
  };

  return (
    <Card
      className="gap-0 overflow-hidden rounded-[15px] border border-border/60 bg-muted/25 p-0 transition hover:ring-1 hover:ring-primary/20 dark:border-border/50 dark:bg-muted/15"
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(room)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(room);
        }
      }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-muted/35 px-[14px] py-[13px] dark:border-border/50 dark:bg-muted/20">
        <div className="flex min-w-0 items-start gap-3">
          <Link
            href={titlePageHref(room.mediaType, room.tmdbId, room.title)}
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-14 w-10 overflow-hidden rounded-md bg-muted">
              <Image
                src={resolveTmdbImageSrc(room.posterPath, room.backdropPath, "w200")}
                alt={`${room.title} poster`}
                fill
                className="object-cover"
                sizes="40px"
                unoptimized
              />
            </div>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={titlePageHref(room.mediaType, room.tmdbId, room.title)}
                className="truncate text-sm font-medium hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {room.title}
              </Link>
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {room.mediaTypeLabel}
              </Badge>
              {room.mediaType === "tv" && room.seasonNumber && room.episodeNumber ? (
                <Badge variant="secondary" className="rounded-full bg-primary/15 text-[10px] text-primary">
                  S{String(room.seasonNumber).padStart(2, "0")} · E{String(room.episodeNumber).padStart(2, "0")}
                </Badge>
              ) : null}
            </div>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {room.releaseYear ?? "Year unknown"} · {room.creatorOrDirector ?? "Creator unknown"}
            </p>
            {canControlPlayback ? (
              <div className="mt-2 flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-pointer rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handlePlaybackToggle();
                  }}
                  disabled={playbackBusy}
                  aria-label={room.currentUserSession.status === "WATCHING_NOW" ? "Pause session" : "Resume session"}
                >
                  {room.currentUserSession.status === "WATCHING_NOW" ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-pointer rounded-full text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handlePlaybackFinish(false);
                  }}
                  disabled={playbackBusy}
                  aria-label="Stop and mark finished"
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
        <Badge className="shrink-0 rounded-full border border-slate-500/25 bg-slate-500/15 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 shadow-none dark:text-slate-300">
          {room.finishedCount} finished tonight
        </Badge>
      </div>

      <div className="border-b border-border/60 bg-muted/30 px-[14px] py-[13px] dark:border-border/50 dark:bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {topAvatars.map((participant) => (
              <Avatar key={participant.userId} className="h-7 w-7 border border-background">
                <AvatarImage src={participant.avatar ?? undefined} alt={participant.name} />
                <AvatarFallback>{participant.name[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <p className="truncate text-[13px] text-slate-600 dark:text-slate-400">
            {(() => {
              const names = room.participants.map((p) => p.name).slice(0, 3);
              if (!names.length) return "Everyone finished within the last hour.";
              if (names.length === 1) return `${names[0]} finished within the last hour.`;
              if (names.length === 2) return `${names[0]} and ${names[1]} both finished within the last hour.`;
              return `${names[0]}, ${names[1]} and ${names[2]} all finished within the last hour.`;
            })()}
          </p>
        </div>
      </div>

      <div className="border-b border-border/60 px-[14px] py-[10px] dark:border-border/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowThoughts((v) => !v);
          }}
          className="h-7 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          <Reply className="h-3.5 w-3.5" /> {showThoughts ? "Hide thoughts" : `Show thoughts (${room.thoughts.length})`}
        </Button>
      </div>

      {showThoughts ? (
        <div className="p-0">
          {room.thoughts.map((thought, index) => (
            <JustFinishedComment
              key={thought.id}
              comment={thought}
              showBorder={index < room.thoughts.length - 1}
              parentThoughtId={thought.id}
              currentUserId={currentUserId}
              onReactionDelta={(delta) => {
                setLocalReactions((count) => Math.max(0, count + delta));
              }}
            />
          ))}
        </div>
      ) : null}
      <div className="border-t border-border/60">
        <div className="grid grid-cols-4 divide-x divide-border/60">
          <div className="inline-flex h-10 items-center justify-center gap-1.5 rounded-none text-xs text-muted-foreground">
            <Smile className={cn("h-3.5 w-3.5", localLiked ? "text-yellow-400" : "")} /> {localReactions}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowThoughts((v) => !v);
            }}
            className="h-10 cursor-pointer justify-center gap-1.5 rounded-none text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{room.thoughts.length}</span>
            <span className="hidden sm:inline">comments</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              void handleWatchlistToggle();
            }}
            disabled={isWatchlistMutating}
            className="h-10 cursor-pointer justify-center gap-1.5 rounded-none text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            <Bookmark className={cn("h-3.5 w-3.5", inWatchlist ? "text-yellow-400 fill-yellow-400" : "")} /> Watchlist
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onWatchNow?.({
                tmdbId: room.tmdbId,
                mediaType: room.mediaType,
                title: room.title,
              });
            }}
            className="h-10 cursor-pointer justify-center gap-1.5 rounded-none text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            <span>Watch Now</span>
          </Button>
        </div>
      </div>
      <AlertDialog open={showFinishOverrideDialog} onOpenChange={setShowFinishOverrideDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish before runtime ends?</AlertDialogTitle>
            <AlertDialogDescription>
              {runtimeMinutes != null
                ? `This title is around ${runtimeMinutes} min and you've watched about ${elapsedMinutes} min. You can still finish now if you ended early.`
                : "You can still finish now if you ended early."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Keep watching</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={() => {
                void handlePlaybackFinish(true);
              }}
            >
              Finish anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function RightRail({
  currentSession,
  alsoWatchingCurrent,
  alsoWatchingTitle,
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
  watchMomentLabel,
}: {
  currentSession: WatchingSessionDTO | null;
  alsoWatchingCurrent: WatchingSessionDTO[];
  alsoWatchingTitle?: string | null;
  watchingNow: WatchingSessionDTO[];
  justFinished: WatchingSessionDTO[];
  trendingTonight: Array<{
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string | null;
    releaseYear: number | null;
    watchingCount: number;
    watchedCount: number;
    totalCount: number;
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
  watchMomentLabel: string;
}) {
  const trendingLabel = useMemo(() => {
    const part = watchMomentLabel.split(" ").pop()?.toLowerCase() ?? "today";
    const isTonight = part === "evening" || part === "night";
    return isTonight ? "Trending tonight" : "Trending today";
  }, [watchMomentLabel]);
  const currentProgress = useMemo(() => {
    if (!currentSession) return 0;
    const capForActiveSession = (value: number) =>
      currentSession.status === "WATCHING_NOW" ? Math.min(99, value) : Math.min(100, value);
    if (typeof currentSession.progressPercent === "number") {
      return Math.max(0, capForActiveSession(currentSession.progressPercent));
    }
    // Fallback to elapsed-time estimate when explicit progress isn't set yet.
    // For active sessions, never show 100% until the session is actually finished.
    const minutesIn = Math.max(1, Math.round((Date.now() - new Date(currentSession.startedAt).getTime()) / 60000));
    const estimatedTotalMinutes =
      currentSession.mediaType === "movie" && currentSession.runtimeMinutes && currentSession.runtimeMinutes > 0
        ? currentSession.runtimeMinutes
        : 120;
    const estimated = Math.round((minutesIn / estimatedTotalMinutes) * 100);
    return Math.max(0, capForActiveSession(estimated));
  }, [currentSession]);
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
    const title = alsoWatchingTitle?.trim() || currentSession?.title?.trim();
    if (!title) return "THIS TITLE";
    return title.length > 24 ? `${title.slice(0, 24)}...` : title;
  }, [alsoWatchingTitle, currentSession?.title]);
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
      <section className="border-b border-border/70 px-[16px] py-6">
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
          <div className="overflow-hidden rounded-[15px] border border-border/60 bg-muted/45 dark:bg-muted/25">
            <div className="flex items-center justify-between border-b border-border/60 px-[13px] py-[8px]">
              <p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Watching now
              </p>
              <p className="text-[12px] text-muted-foreground">Started {timeAgo(currentSession.startedAt)}</p>
            </div>

            <div className="space-y-[10px] px-[13px] py-[12px]">
              <div className="flex items-start gap-[10px]">
                <Link href={titlePageHref(currentSession.mediaType, currentSession.tmdbId, currentSession.title)} className="shrink-0">
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
                      href={titlePageHref(currentSession.mediaType, currentSession.tmdbId, currentSession.title)}
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
                  {isSubmitting ? "Sharing..." : "Share thought"}
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

      <section className="border-b border-border/70 px-[16px] py-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="truncate text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              ALSO WATCHING {alsoWatchingTitleLabel}
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

      <section className="border-b border-border/70 px-[16px] py-6">
        <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{trendingLabel}</p>
        <div className="divide-y divide-border/60">
          {trendingTonight.map((item, i) => (
            <div
              key={`${item.mediaType}-${item.tmdbId}`}
              className="flex w-full items-center gap-2 sm:gap-[14px] py-[8px] text-left hover:bg-muted/30"
            >
              <span className="w-7 text-center font-serif text-[18px] font-semibold leading-none text-muted-foreground">{i + 1}</span>
              <Link href={titlePageHref(item.mediaType, item.tmdbId, item.title)} className="shrink-0">
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
              <div className="min-w-0 flex-1 pr-1">
                <Link
                  href={titlePageHref(item.mediaType, item.tmdbId, item.title)}
                  className="block truncate text-[13px] font-medium hover:underline"
                >
                  {item.title}
                </Link>
                <p className="text-[12px] text-muted-foreground">
                  {item.releaseYear ?? "Year unknown"} · {item.mediaType === "movie" ? "Movie" : "TV"}
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex min-w-[4.5rem] shrink-0 items-center justify-end rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  item.watchingCount > 0
                    ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "border-slate-500/25 bg-slate-500/15 text-slate-700 dark:text-slate-300"
                )}
              >
                {item.watchingCount > 0 ? `${item.watchingCount} watching` : `${item.watchedCount} watched`}
              </span>
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
          {!trendingTonight.length ? <p className="py-[8px] text-[12px] text-muted-foreground">No trending titles yet.</p> : null}
        </div>
      </section>

      <section className="px-[16px] py-6">
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
                  <p className="truncate text-[13px] text-muted-foreground">
                    <span className="font-medium text-foreground">{reply.userName}</span>
                    <span className="px-1 text-muted-foreground/70">·</span>
                    <span>{timeAgo(reply.createdAt)}</span>
                  </p>
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
  const isMobile = useIsMobile();
  const { data: currentUser, isLoading } = useCurrentUser();
  const { data: watchingData, isLoading: isWatchingLoading } = useWatchingDashboard(true);
  const watchingMutation = useWatchingMutation();
  const [uiNowTick, setUiNowTick] = useState(() => Date.now());
  const [isRightOpen, setIsRightOpen] = useState(false);
  const [watchSearchQuery, setWatchSearchQuery] = useState("");
  const debouncedWatchSearch = useDebounce(watchSearchQuery, 300);
  const { data: watchSearchResults, isLoading: isWatchSearchLoading } = useSearch({
    query: debouncedWatchSearch,
    type: "all",
    page: 1,
  });
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [selectedPick, setSelectedPick] = useState<{
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string | null;
    backdropPath: string | null;
    seasonNumber?: number | null;
    episodeNumber?: number | null;
  } | null>(null);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<string>("");
  const [selectedEpisodeNumber, setSelectedEpisodeNumber] = useState<string>("");
  const [thoughtText, setThoughtText] = useState("");
  const [spoilerMode, setSpoilerMode] = useState(false);
  const [showAllWatchingNow, setShowAllWatchingNow] = useState(false);
  const [watchingNowPage, setWatchingNowPage] = useState(1);
  const [showAllJustFinished, setShowAllJustFinished] = useState(false);
  const [justFinishedPage, setJustFinishedPage] = useState(1);
  const [isChangingTitle, setIsChangingTitle] = useState(false);
  const [joiningRoomKey, setJoiningRoomKey] = useState<string | null>(null);
  const [activeCardContext, setActiveCardContext] = useState<{
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    seasonNumber?: number | null;
    episodeNumber?: number | null;
  } | null>(null);
  const [watchMomentLabel, setWatchMomentLabel] = useState(() => {
    const now = new Date();
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now);
    const h = now.getHours();
    const part = h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night";
    return `${weekday} ${part}`;
  });
  const [watchModalTarget, setWatchModalTarget] = useState<{
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
  } | null>(null);
  const [watchCountry, setWatchCountry] = useState("US");
  const { data: justwatchCountries = [] } = useJustWatchCountries();
  const { data: watchAvailability, isLoading: isLoadingWatchAvailability } = useWatchProviders(
    watchModalTarget?.mediaType ?? "movie",
    watchModalTarget?.tmdbId ?? null,
    watchCountry
  );

  useEffect(() => {
    const t = window.setInterval(() => setUiNowTick(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

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

  const watchingNow = useMemo(
    () => (watchingData?.watchingNow ?? []).map(toFeedCard),
    [watchingData?.watchingNow, uiNowTick]
  );
  const watchingNowRooms = useMemo<WatchingNowRoomCard[]>(() => {
    const sessions = watchingData?.watchingNow ?? [];
    const groups = new Map<string, WatchingNowRoomCard>();
    for (const session of sessions) {
      const seasonEpisodeKey =
        session.mediaType === "tv" && session.seasonNumber && session.episodeNumber
          ? `:s${session.seasonNumber}:e${session.episodeNumber}`
          : "";
      const key = `${session.mediaType}:${session.tmdbId}${seasonEpisodeKey}`;
      const existing = groups.get(key);
      const isActiveWatcher = session.status === "WATCHING_NOW";
      const participantName = session.user.displayName || session.user.username || "Unknown";
      const thoughtsForSession = session.thoughts.map((thought) => ({
        id: thought.id,
        userId: thought.user.id,
        content: thought.content,
        isSpoiler: thought.isSpoiler,
        createdAt: thought.createdAt,
        user: thought.user.displayName || thought.user.username || "Unknown",
        avatar: thought.user.avatarUrl ?? null,
        reactionCount: thought.reactionCount ?? 0,
        replyCount: thought.replyCount ?? 0,
        myReactions: thought.myReactions ?? [],
        sessionStatus: "WATCHING_NOW" as const,
      }));
      if (!existing) {
        groups.set(key, {
          key,
          tmdbId: session.tmdbId,
          mediaType: session.mediaType,
          title: session.title,
          mediaTypeLabel: session.mediaType === "movie" ? "Movie" : "TV",
          seasonNumber: session.seasonNumber ?? null,
          episodeNumber: session.episodeNumber ?? null,
          posterPath: session.posterPath,
          backdropPath: session.backdropPath,
          releaseYear: session.releaseYear ?? null,
          creatorOrDirector: session.creatorOrDirector ?? null,
          watchingCount: isActiveWatcher ? 1 : 0,
          participants: isActiveWatcher
            ? [{ userId: session.user.id, name: participantName, avatar: session.user.avatarUrl ?? null }]
            : [],
          featuredThought: thoughtsForSession[0] ?? null,
          thoughts: thoughtsForSession,
          thoughtCount: thoughtsForSession.length,
          reactionCount: thoughtsForSession.reduce((sum, thought) => sum + (thought.reactionCount ?? 0), 0),
          primaryThoughtId: session.thoughts[0]?.id ?? null,
          currentUserSession:
            currentUser?.id && session.user.id === currentUser.id
              ? {
                  sessionId: session.id,
                  startedAt: session.startedAt,
                  mediaType: session.mediaType,
                  status: session.status === "STOPPED" ? "STOPPED" : "WATCHING_NOW",
                  progressPercent: session.progressPercent ?? null,
                  runtimeMinutes: session.runtimeMinutes ?? null,
                }
              : null,
          currentUserFinishedAt:
            currentUser?.id &&
            session.user.id === currentUser.id &&
            session.status === "JUST_FINISHED" &&
            session.endedAt
              ? session.endedAt
              : null,
        });
      } else {
        if (isActiveWatcher) {
          existing.watchingCount += 1;
        }
        if (isActiveWatcher && !existing.participants.some((p) => p.userId === session.user.id)) {
          existing.participants.push({
            userId: session.user.id,
            name: participantName,
            avatar: session.user.avatarUrl ?? null,
          });
        }
        existing.thoughts.push(...thoughtsForSession);
        existing.thoughts.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        existing.featuredThought = existing.thoughts[0] ?? null;
        existing.thoughtCount = existing.thoughts.length;
        existing.reactionCount = existing.thoughts.reduce((sum, thought) => sum + (thought.reactionCount ?? 0), 0);
        if (!existing.currentUserSession && currentUser?.id && session.user.id === currentUser.id) {
          if (session.status === "WATCHING_NOW" || session.status === "STOPPED") {
            existing.currentUserSession = {
              sessionId: session.id,
              startedAt: session.startedAt,
              mediaType: session.mediaType,
              status: session.status === "STOPPED" ? "STOPPED" : "WATCHING_NOW",
              progressPercent: session.progressPercent ?? null,
              runtimeMinutes: session.runtimeMinutes ?? null,
            };
          }
          if (session.status === "JUST_FINISHED" && session.endedAt) {
            existing.currentUserFinishedAt = session.endedAt;
          }
        }
      }
    }
    if (currentUser?.id) {
      const myRecentFinished = (watchingData?.justFinished ?? [])
        .filter((session) => session.userId === currentUser.id && session.status === "JUST_FINISHED")
        .sort(
          (a, b) =>
            new Date(b.endedAt ?? b.updatedAt).getTime() -
            new Date(a.endedAt ?? a.updatedAt).getTime()
        );
      for (const session of myRecentFinished) {
        const seasonEpisodeKey =
          session.mediaType === "tv" && session.seasonNumber && session.episodeNumber
            ? `:s${session.seasonNumber}:e${session.episodeNumber}`
            : "";
        const key = `${session.mediaType}:${session.tmdbId}${seasonEpisodeKey}`;
        const room = groups.get(key);
        if (!room) continue;
        room.currentUserFinishedAt = session.endedAt ?? session.updatedAt;
      }
    }
    return Array.from(groups.values()).sort((a, b) => b.watchingCount - a.watchingCount);
  }, [watchingData?.watchingNow, watchingData?.justFinished, currentUser?.id]);
  const activeWatchingPeopleCount = useMemo(
    () => (watchingData?.watchingNow ?? []).filter((session) => session.status === "WATCHING_NOW").length,
    [watchingData?.watchingNow]
  );
  const justFinished = useMemo(
    () => (watchingData?.justFinished ?? []).map(toFeedCard),
    [watchingData?.justFinished]
  );
  const justFinishedRooms = useMemo<JustFinishedRoomCard[]>(() => {
    const sessions = watchingData?.justFinished ?? [];
    const groups = new Map<string, JustFinishedRoomCard>();
    for (const session of sessions) {
      const seasonEpisodeKey =
        session.mediaType === "tv" && session.seasonNumber && session.episodeNumber
          ? `:s${session.seasonNumber}:e${session.episodeNumber}`
          : "";
      const key = `${session.mediaType}:${session.tmdbId}${seasonEpisodeKey}`;
      const existing = groups.get(key);
      const participantName = session.user.displayName || session.user.username || "Unknown";
      const thoughtsForSession = session.thoughts.map((thought) => ({
        id: thought.id,
        userId: thought.user.id,
        content: thought.content,
        isSpoiler: thought.isSpoiler,
        createdAt: thought.createdAt,
        user: thought.user.displayName || thought.user.username || "Unknown",
        avatar: thought.user.avatarUrl ?? null,
        reactionCount: thought.reactionCount ?? 0,
        replyCount: thought.replyCount ?? 0,
        myReactions: thought.myReactions ?? [],
        sessionStatus: "JUST_FINISHED" as const,
      }));
      if (!existing) {
        groups.set(key, {
          key,
          tmdbId: session.tmdbId,
          mediaType: session.mediaType,
          title: session.title,
          mediaTypeLabel: session.mediaType === "movie" ? "Movie" : "TV",
          seasonNumber: session.seasonNumber ?? null,
          episodeNumber: session.episodeNumber ?? null,
          posterPath: session.posterPath,
          backdropPath: session.backdropPath,
          releaseYear: session.releaseYear ?? null,
          creatorOrDirector: session.creatorOrDirector ?? null,
          finishedCount: 1,
          participants: [{ userId: session.user.id, name: participantName, avatar: session.user.avatarUrl ?? null }],
          thoughts: thoughtsForSession,
          reactionCount: thoughtsForSession.reduce((sum, thought) => sum + (thought.reactionCount ?? 0), 0),
          currentUserSession: null,
        });
      } else {
        existing.finishedCount += 1;
        if (!existing.participants.some((p) => p.userId === session.user.id)) {
          existing.participants.push({
            userId: session.user.id,
            name: participantName,
            avatar: session.user.avatarUrl ?? null,
          });
        }
        existing.thoughts.push(...thoughtsForSession);
        existing.reactionCount = existing.thoughts.reduce((sum, thought) => sum + (thought.reactionCount ?? 0), 0);
      }
    }
    const currentSession = watchingData?.currentSession;
    if (currentSession && currentUser?.id && currentSession.userId === currentUser.id) {
      const currentSeasonEpisodeKey =
        currentSession.mediaType === "tv" && currentSession.seasonNumber && currentSession.episodeNumber
          ? `:s${currentSession.seasonNumber}:e${currentSession.episodeNumber}`
          : "";
      const currentKey = `${currentSession.mediaType}:${currentSession.tmdbId}${currentSeasonEpisodeKey}`;
      const targetRoom = groups.get(currentKey);
      if (targetRoom) {
        targetRoom.currentUserSession = {
          sessionId: currentSession.id,
          startedAt: currentSession.startedAt,
          mediaType: currentSession.mediaType,
          status: currentSession.status === "STOPPED" ? "STOPPED" : "WATCHING_NOW",
          progressPercent: currentSession.progressPercent ?? null,
          runtimeMinutes: currentSession.runtimeMinutes ?? null,
        };
      }
    }
    const rooms = Array.from(groups.values()).map((room) => ({
      ...room,
      thoughts: [...room.thoughts].sort(
        (a, b) =>
          (b.reactionCount + b.replyCount) - (a.reactionCount + a.replyCount) ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }));
    return rooms.sort((a, b) => b.finishedCount - a.finishedCount);
  }, [watchingData?.justFinished, watchingData?.currentSession, currentUser?.id]);
  const WATCHING_NOW_PAGE_SIZE = 10;
  const JUST_FINISHED_PAGE_SIZE = 10;
  const watchingNowTotalPages = Math.max(1, Math.ceil(watchingNowRooms.length / WATCHING_NOW_PAGE_SIZE));
  const justFinishedTotalPages = Math.max(1, Math.ceil(justFinishedRooms.length / JUST_FINISHED_PAGE_SIZE));
  const visibleWatchingNow = useMemo(() => {
    if (!showAllWatchingNow) return watchingNowRooms.slice(0, 3);
    const start = (watchingNowPage - 1) * WATCHING_NOW_PAGE_SIZE;
    return watchingNowRooms.slice(start, start + WATCHING_NOW_PAGE_SIZE);
  }, [showAllWatchingNow, watchingNowRooms, watchingNowPage]);
  const visibleJustFinished = useMemo(() => {
    if (!showAllJustFinished) return justFinishedRooms.slice(0, 3);
    const start = (justFinishedPage - 1) * JUST_FINISHED_PAGE_SIZE;
    return justFinishedRooms.slice(start, start + JUST_FINISHED_PAGE_SIZE);
  }, [showAllJustFinished, justFinishedRooms, justFinishedPage]);

  const effectiveAlsoWatchingContext = useMemo(() => {
    if (activeCardContext) return activeCardContext;
    const currentSession = watchingData?.currentSession;
    if (!currentSession) return null;
    return {
      tmdbId: currentSession.tmdbId,
      mediaType: currentSession.mediaType,
      title: currentSession.title,
      seasonNumber: currentSession.seasonNumber ?? null,
      episodeNumber: currentSession.episodeNumber ?? null,
    } as const;
  }, [activeCardContext, watchingData?.currentSession]);

  const contextualAlsoWatching = useMemo(() => {
    const watchingSessions = watchingData?.watchingNow ?? [];
    const currentUserId = currentUser?.id;
    if (!effectiveAlsoWatchingContext) return watchingData?.alsoWatchingCurrent ?? [];
    return watchingSessions.filter(
      (session) =>
        session.tmdbId === effectiveAlsoWatchingContext.tmdbId &&
        session.mediaType === effectiveAlsoWatchingContext.mediaType &&
        (effectiveAlsoWatchingContext.mediaType !== "tv" ||
          ((session.seasonNumber ?? null) === (effectiveAlsoWatchingContext.seasonNumber ?? null) &&
            (session.episodeNumber ?? null) === (effectiveAlsoWatchingContext.episodeNumber ?? null))) &&
        session.userId !== currentUserId
    );
  }, [watchingData?.watchingNow, watchingData?.alsoWatchingCurrent, effectiveAlsoWatchingContext, currentUser?.id]);

  useEffect(() => {
    if (!activeCardContext) return;
    const existsInFeed = (watchingData?.watchingNow ?? []).some(
      (session) =>
        session.tmdbId === activeCardContext.tmdbId &&
        session.mediaType === activeCardContext.mediaType &&
        (activeCardContext.mediaType !== "tv" ||
          ((session.seasonNumber ?? null) === (activeCardContext.seasonNumber ?? null) &&
            (session.episodeNumber ?? null) === (activeCardContext.episodeNumber ?? null)))
    );
    if (!existsInFeed) {
      setActiveCardContext(null);
    }
  }, [activeCardContext, watchingData?.watchingNow]);

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

  const submitStartWatching = async (
    overridePick?: {
      tmdbId: number;
      mediaType: "movie" | "tv";
      title: string;
      posterPath: string | null;
      backdropPath: string | null;
      seasonNumber?: number | null;
      episodeNumber?: number | null;
    }
  ): Promise<boolean> => {
    const pick = overridePick ?? selectedPick;
    if (!pick) {
      toast.error("Search and pick a movie or TV show to start.");
      return false;
    }
    const parsedSeason =
      pick.mediaType === "tv" ? Number.parseInt(selectedSeasonNumber, 10) : NaN;
    const parsedEpisode =
      pick.mediaType === "tv" ? Number.parseInt(selectedEpisodeNumber, 10) : NaN;
    const seasonNumber =
      pick.mediaType === "tv" ? (Number.isInteger(parsedSeason) && parsedSeason > 0 ? parsedSeason : null) : null;
    const episodeNumber =
      pick.mediaType === "tv" ? (Number.isInteger(parsedEpisode) && parsedEpisode > 0 ? parsedEpisode : null) : null;
    const finalPick = overridePick
      ? pick
      : {
          ...pick,
          seasonNumber,
          episodeNumber,
        };

    try {
      const activeSession = watchingData?.currentSession;
      if (
        activeSession &&
        (activeSession.tmdbId !== finalPick.tmdbId ||
          activeSession.mediaType !== finalPick.mediaType ||
          (activeSession.seasonNumber ?? null) !== (finalPick.seasonNumber ?? null) ||
          (activeSession.episodeNumber ?? null) !== (finalPick.episodeNumber ?? null))
      ) {
        await watchingMutation.mutateAsync({
          action: "stop",
          sessionId: activeSession.id,
        });
      }
      await watchingMutation.mutateAsync({
        action: "start",
        tmdbId: finalPick.tmdbId,
        mediaType: finalPick.mediaType,
        title: finalPick.title,
        posterPath: finalPick.posterPath,
        backdropPath: finalPick.backdropPath,
        seasonNumber: finalPick.mediaType === "tv" ? finalPick.seasonNumber ?? null : null,
        episodeNumber: finalPick.mediaType === "tv" ? finalPick.episodeNumber ?? null : null,
      });
      toast.success("Watching session started.");
      setWatchSearchQuery("");
      setSelectedPick(null);
      setThoughtText("");
      setSpoilerMode(false);
      setIsChangingTitle(false);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start session");
      return false;
    }
  };

  const clearActiveWatching = async () => {
    const activeSession = watchingData?.currentSession;
    if (!activeSession) return;
    try {
      await watchingMutation.mutateAsync({
        action: "stop",
        sessionId: activeSession.id,
      });
      setWatchSearchQuery("");
      setSelectedPick(null);
      setIsChangingTitle(false);
      toast.success("Stopped current watching session.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to stop current session");
    }
  };

  const activeSession = watchingData?.currentSession ?? null;
  const isWatchingActive = Boolean(activeSession) && !isChangingTitle;
  const composeInputValue = isWatchingActive ? activeSession?.title ?? "" : watchSearchQuery;

  useEffect(() => {
    if (!watchingData?.currentSession) {
      setIsChangingTitle(false);
    }
  }, [watchingData?.currentSession]);

  useEffect(() => {
    if (!selectedPick || selectedPick.mediaType !== "tv") return;
    if (selectedSeasonNumber || selectedEpisodeNumber) return;
    if (
      activeSession &&
      activeSession.mediaType === "tv" &&
      activeSession.tmdbId === selectedPick.tmdbId
    ) {
      setSelectedSeasonNumber(activeSession.seasonNumber ? String(activeSession.seasonNumber) : "1");
      setSelectedEpisodeNumber(activeSession.episodeNumber ? String(activeSession.episodeNumber) : "1");
      return;
    }
    setSelectedSeasonNumber("1");
    setSelectedEpisodeNumber("1");
  }, [
    selectedPick,
    activeSession,
    selectedSeasonNumber,
    selectedEpisodeNumber,
  ]);

  const submitShareThought = async () => {
    const sessionId = watchingData?.currentSession?.id;
    if (!sessionId || !thoughtText.trim()) return;
    const validationError = validateWatchingTextInput(thoughtText.trim());
    if (validationError) {
      toast.error(validationError);
      return;
    }
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

  if (isLoading || isWatchingLoading) {
    return (
      <div className="h-full">
        <div className="grid min-h-[calc(100vh-65px)] grid-cols-1 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
          <main className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-4 space-y-2 sm:mb-6">
              <Skeleton className="h-8 w-72" />
              <Skeleton className="h-5 w-96 max-w-full" />
            </div>
            <Skeleton className="h-[72px] w-full rounded-[15px]" />

            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-7 w-14" />
            </div>
            <Skeleton className="h-[260px] w-full rounded-[15px]" />
            <Skeleton className="h-[260px] w-full rounded-[15px]" />

            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-7 w-14" />
            </div>
            <Skeleton className="h-[300px] w-full rounded-[15px]" />
            <Skeleton className="h-[300px] w-full rounded-[15px]" />
          </main>

          <aside className="hidden border-l border-border/70 bg-muted/20 px-[14px] py-6 lg:block dark:bg-muted/10">
            <div className="space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-[230px] w-full rounded-[15px]" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-28 w-full rounded-[10px]" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-32 w-full rounded-[10px]" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-24 w-full rounded-[10px]" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-xl border-border/70">
          <CardHeader>
            <p className="text-lg font-semibold">Sign in required</p>
            <p className="text-sm text-muted-foreground">
              Please sign in to view what people are watching right now.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="cursor-pointer">
              <Link href="/sign-in">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div
        className={cn(
          "grid min-h-[calc(100vh-65px)] grid-cols-1",
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
            className="rounded-[15px] border border-border/60 bg-muted/25 p-4 ring-1 ring-transparent transition hover:ring-primary/25 focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-border/50 dark:bg-muted/15"
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!isWatchingActive) setSearchModalOpen(true);
            }}
            onKeyDown={(e) => {
              if (isWatchingActive) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSearchModalOpen(true);
              }
            }}
          >
            <div className={cn("flex gap-2", isMobile ? "flex-col" : "flex-row items-center")}>
              {!isMobile ? (
              <Avatar className="hidden h-9 w-9 shrink-0 md:flex">
                <AvatarImage src={currentUser?.avatarUrl ?? undefined} />
                <AvatarFallback>{(currentUser?.username || currentUser?.displayName || "U")[0]}</AvatarFallback>
              </Avatar>
              ) : null}
              <div className="relative min-w-0 flex-1">
                <Input
                  value={composeInputValue}
                  readOnly
                  onClick={() => {
                    if (!isWatchingActive) setSearchModalOpen(true);
                  }}
                  placeholder={`What are you watching right now, ${currentUser?.displayName || currentUser?.username || "there"}?`}
                  className={cn(
                    "h-10 w-full cursor-pointer bg-transparent text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent",
                    isMobile
                      ? "border border-border px-4 pr-10"
                      : "border-0 px-0 pr-10"
                  )}
                  autoComplete="off"
                />
                {isWatchingActive ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 cursor-pointer rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      void clearActiveWatching();
                    }}
                    disabled={watchingMutation.isPending}
                    aria-label="Clear active watching session"
                    title="Clear active watching session"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
              <Button
                type="button"
                className={cn(
                  "h-9 shrink-0 cursor-pointer rounded-[20px] border px-4 text-[14px] whitespace-nowrap",
                  isMobile ? "w-full" : "w-auto",
                  isWatchingActive
                    ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                    : "border-primary/30 bg-primary/15 text-primary hover:bg-primary/20 dark:border-primary/35 dark:bg-primary/20 dark:text-primary-foreground"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isWatchingActive) return;
                  void submitStartWatching();
                }}
                disabled={
                  isWatchingActive ||
                  watchingMutation.isPending ||
                  !selectedPick ||
                  (selectedPick.mediaType === "tv" &&
                    (!Number.isInteger(Number.parseInt(selectedSeasonNumber, 10)) ||
                      Number.parseInt(selectedSeasonNumber, 10) <= 0 ||
                      !Number.isInteger(Number.parseInt(selectedEpisodeNumber, 10)) ||
                      Number.parseInt(selectedEpisodeNumber, 10) <= 0))
                }
              >
                {isWatchingActive ? "Watching now" : "I'm watching..."}
              </Button>
            </div>
          </div>
          <Dialog open={searchModalOpen} onOpenChange={setSearchModalOpen}>
            <DialogContent className="max-w-2xl p-0">
              <DialogHeader className="border-b border-border/60 px-4 py-3">
                <DialogTitle className="text-base">Search title to start watching</DialogTitle>
              </DialogHeader>
              <div className="px-4 py-3">
                <Input
                  value={watchSearchQuery}
                  onChange={(e) => {
                    const v = e.target.value;
                    setWatchSearchQuery(v);
                    if (selectedPick && v !== selectedPick.title) {
                      setSelectedPick(null);
                      setSelectedSeasonNumber("");
                      setSelectedEpisodeNumber("");
                    }
                  }}
                  autoFocus
                  placeholder="Search movie or TV show..."
                  className="h-10 border-border/60 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                  autoComplete="off"
                />
              </div>
              <div className="min-h-[280px] max-h-[55vh] overflow-y-auto border-t border-border/60 p-2 scrollbar-thin">
                {!debouncedWatchSearch.trim() ? (
                  <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
                    Start typing to search.
                  </div>
                ) : isWatchSearchLoading ? (
                  <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
                    Searching...
                  </div>
                ) : watchSearchResults?.results && watchSearchResults.results.length > 0 ? (
                  watchSearchResults.results.map((item) => {
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
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-3 rounded-md p-2 text-left hover:bg-muted",
                          selectedPick?.tmdbId === item.id && selectedPick?.mediaType === mediaType
                            ? "bg-emerald-500/10 ring-1 ring-emerald-500/40"
                            : ""
                        )}
                        onClick={() => {
                          setSelectedPick({
                            tmdbId: item.id,
                            mediaType,
                            title,
                            posterPath: item.poster_path ?? null,
                            backdropPath: item.backdrop_path ?? null,
                          });
                          setSelectedSeasonNumber("");
                          setSelectedEpisodeNumber("");
                          setWatchSearchQuery(title);
                          if (mediaType === "movie") {
                            setSearchModalOpen(false);
                          }
                        }}
                      >
                        {poster ? (
                          <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-muted">
                            <Image src={getPosterUrl(poster, "w200")} alt="" fill className="object-cover" sizes="40px" unoptimized />
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
                        {selectedPick?.tmdbId === item.id && selectedPick?.mediaType === mediaType ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
                    No results found.
                  </div>
                )}
              </div>
              {selectedPick?.mediaType === "tv" ? (
                <div className="border-t border-border/60 px-4 py-3">
                  <p className="mb-1 text-[12px] text-muted-foreground">Now watching (TV episode)</p>
                  <p className="mb-2 text-[11px] text-muted-foreground">Rooms are episode-specific: one episode per room.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex h-9 items-center rounded-[20px] border border-border/60 bg-transparent px-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mr-1 h-6 w-6 cursor-pointer rounded-full text-muted-foreground hover:bg-muted"
                        onClick={() =>
                          setSelectedSeasonNumber((prev) => {
                            const current = Math.max(1, Number.parseInt(prev || "1", 10) || 1);
                            return String(Math.max(1, current - 1));
                          })
                        }
                        aria-label="Decrease season"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="mr-2 text-[12px] font-medium text-muted-foreground">S</span>
                      <Input
                        value={selectedSeasonNumber}
                        onChange={(e) => setSelectedSeasonNumber(e.target.value.replace(/[^\d]/g, ""))}
                        placeholder="01"
                        className="h-full border-0 bg-transparent px-0 text-center text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        inputMode="numeric"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-1 h-6 w-6 cursor-pointer rounded-full text-muted-foreground hover:bg-muted"
                        onClick={() =>
                          setSelectedSeasonNumber((prev) => {
                            const current = Math.max(1, Number.parseInt(prev || "1", 10) || 1);
                            return String(current + 1);
                          })
                        }
                        aria-label="Increase season"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex h-9 items-center rounded-[20px] border border-border/60 bg-transparent px-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mr-1 h-6 w-6 cursor-pointer rounded-full text-muted-foreground hover:bg-muted"
                        onClick={() =>
                          setSelectedEpisodeNumber((prev) => {
                            const current = Math.max(1, Number.parseInt(prev || "1", 10) || 1);
                            return String(Math.max(1, current - 1));
                          })
                        }
                        aria-label="Decrease episode"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="mr-2 text-[12px] font-medium text-muted-foreground">E</span>
                      <Input
                        value={selectedEpisodeNumber}
                        onChange={(e) => setSelectedEpisodeNumber(e.target.value.replace(/[^\d]/g, ""))}
                        placeholder="01"
                        className="h-full border-0 bg-transparent px-0 text-center text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        inputMode="numeric"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-1 h-6 w-6 cursor-pointer rounded-full text-muted-foreground hover:bg-muted"
                        onClick={() =>
                          setSelectedEpisodeNumber((prev) => {
                            const current = Math.max(1, Number.parseInt(prev || "1", 10) || 1);
                            return String(current + 1);
                          })
                        }
                        aria-label="Increase episode"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        const started = await submitStartWatching();
                        if (started) setSearchModalOpen(false);
                      }}
                      disabled={
                        !Number.isInteger(Number.parseInt(selectedSeasonNumber, 10)) ||
                        Number.parseInt(selectedSeasonNumber, 10) <= 0 ||
                        !Number.isInteger(Number.parseInt(selectedEpisodeNumber, 10)) ||
                        Number.parseInt(selectedEpisodeNumber, 10) <= 0
                      }
                      className="h-8 cursor-pointer rounded-[20px] px-3 text-xs"
                    >
                      Use episode
                    </Button>
                  </div>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>

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
                <span className="text-emerald-500">· {activeWatchingPeopleCount} PEOPLE</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowAllWatchingNow(true)}
              disabled={watchingNowRooms.length <= 3}
            >
              See all
            </Button>
          </div>

          {visibleWatchingNow.map((room) => (
            <WatchingNowGroupCard
              key={room.key}
              room={room}
              currentUserId={currentUser?.id ?? null}
              isJoiningRoom={joiningRoomKey === room.key}
              onWatchNow={(selectedRoom) => {
                setWatchModalTarget({
                  tmdbId: selectedRoom.tmdbId,
                  mediaType: selectedRoom.mediaType,
                  title: selectedRoom.title,
                });
              }}
              onJoinRoom={async (selectedRoom) => {
                setJoiningRoomKey(selectedRoom.key);
                try {
                  await submitStartWatching({
                    tmdbId: selectedRoom.tmdbId,
                    mediaType: selectedRoom.mediaType,
                    title: selectedRoom.title,
                    posterPath: selectedRoom.posterPath,
                    backdropPath: selectedRoom.backdropPath,
                    seasonNumber: selectedRoom.seasonNumber ?? null,
                    episodeNumber: selectedRoom.episodeNumber ?? null,
                  });
                } finally {
                  setJoiningRoomKey((current) => (current === selectedRoom.key ? null : current));
                }
              }}
              onSelect={(selectedRoom) =>
                setActiveCardContext({
                  tmdbId: selectedRoom.tmdbId,
                  mediaType: selectedRoom.mediaType,
                  title: selectedRoom.title,
                  seasonNumber: selectedRoom.seasonNumber ?? null,
                  episodeNumber: selectedRoom.episodeNumber ?? null,
                })
              }
            />
          ))}
          {!watchingNowRooms.length ? <p className="text-sm text-muted-foreground">No one in your network is watching right now.</p> : null}

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
              disabled={justFinishedRooms.length <= 3}
            >
              See all
            </Button>
          </div>

          {visibleJustFinished.map((room) => (
            <JustFinishedGroupCard
              key={room.key}
              room={room}
              currentUserId={currentUser?.id ?? null}
              onWatchNow={(selectedRoom) => {
                setWatchModalTarget({
                  tmdbId: selectedRoom.tmdbId,
                  mediaType: selectedRoom.mediaType,
                  title: selectedRoom.title,
                });
              }}
              onSelect={(selectedRoom) =>
                setActiveCardContext({
                  tmdbId: selectedRoom.tmdbId,
                  mediaType: selectedRoom.mediaType,
                  title: selectedRoom.title,
                  seasonNumber: selectedRoom.seasonNumber ?? null,
                  episodeNumber: selectedRoom.episodeNumber ?? null,
                })
              }
            />
          ))}
          {!justFinishedRooms.length ? <p className="text-sm text-muted-foreground">No recent finishes yet.</p> : null}

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
              className="absolute -left-3 top-[12px] inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setIsRightOpen(false)}
              aria-label="Collapse sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <RightRail
              currentSession={watchingData?.currentSession ?? null}
              alsoWatchingCurrent={contextualAlsoWatching}
              alsoWatchingTitle={effectiveAlsoWatchingContext?.title ?? null}
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
                setSearchModalOpen(true);
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
                setSelectedSeasonNumber("");
                setSelectedEpisodeNumber("");
                setWatchSearchQuery(item.title);
                setSearchModalOpen(false);
                toast.message("Loaded trending title — tap I'm watching... when ready.");
              }}
              isSubmitting={watchingMutation.isPending}
              watchMomentLabel={watchMomentLabel}
            />
          </aside>
        ) : null}
      </div>
      <Dialog
        open={Boolean(watchModalTarget)}
        onOpenChange={(open) => {
          if (!open) setWatchModalTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-none lg:max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-muted-foreground">
              Where to Watch{" "}
              <span className="text-foreground font-semibold">{watchModalTarget?.title ?? ""}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-1 py-4 min-h-0">
            {watchAvailability ? (
              <WatchBreakdownSection
                availability={watchAvailability}
                isLoading={false}
                watchCountry={watchCountry}
                onWatchCountryChange={setWatchCountry}
                justwatchCountries={justwatchCountries}
                compact
              />
            ) : (
              <div className="flex min-h-[180px] items-center justify-center text-sm text-muted-foreground">
                {isLoadingWatchAvailability ? "Loading watch availability..." : "No watch availability found yet."}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

