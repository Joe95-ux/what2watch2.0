"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, MoreHorizontal, Pencil, Reply, Search, Smile, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WatchingTitlePresenceResponse } from "@/lib/watching-types";
import {
  useAddWatchingThoughtReply,
  useDeleteWatchingThought,
  useDeleteWatchingThoughtReply,
  useUpdateWatchingThought,
  useUpdateWatchingThoughtReply,
  useWatchingMutation,
  useWatchingThoughtReaction,
  useWatchingThoughtReplies,
} from "@/hooks/use-watching";
import { useCurrentUser } from "@/hooks/use-current-user";
import { JoinDiscussionComposer } from "@/components/content-detail/join-discussion-composer";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { getWatchingReplyValidationError, getWatchingThoughtValidationError } from "@/lib/moderation";

type DiscussionSort = "newest" | "oldest" | "replies" | "reactions";

const discussionSortLabels: Record<DiscussionSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  replies: "Most replies",
  reactions: "Most reactions",
};

const EMOJI_REACTIONS = ["like", "🔥", "😂", "😮", "😭"] as const;

const timeAgo = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
};

const formatEpisodeTag = (seasonNumber: number | null, episodeNumber: number | null) => {
  if (!seasonNumber || !episodeNumber) return "General";
  return `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
};

function ThoughtCard({
  thought,
  blurred = false,
  highlighted = false,
  showEpisodeContext = false,
}: {
  thought: WatchingTitlePresenceResponse["recentThoughts"][number] | WatchingTitlePresenceResponse["spoilerThoughts"][number];
  blurred?: boolean;
  highlighted?: boolean;
  showEpisodeContext?: boolean;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [expandReplies, setExpandReplies] = useState(false);
  const [isSpoilerRevealed, setIsSpoilerRevealed] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [replyInput, setReplyInput] = useState("");
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [editText, setEditText] = useState(thought.content);
  const [isEditing, setIsEditing] = useState(false);
  const [replyEditState, setReplyEditState] = useState<{ id: string; content: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "thought" | "reply"; id: string } | null>(null);
  const [localReactionCount, setLocalReactionCount] = useState(thought.reactionCount);
  const [localReplyCount, setLocalReplyCount] = useState(thought.replyCount);
  const [localMyReactions, setLocalMyReactions] = useState<string[]>(thought.myReactions ?? []);
  const { data: replies } = useWatchingThoughtReplies(thought.thoughtId, showReplies);
  const [optimisticReplies, setOptimisticReplies] = useState<
    Array<{
      id: string;
      user: { id: string; displayName: string | null; username: string | null; avatarUrl: string | null };
      content: string;
      parentReplyId: string | null;
      createdAt: string;
    }>
  >([]);
  const addReplyMutation = useAddWatchingThoughtReply();
  const { addMutation, removeMutation } = useWatchingThoughtReaction();
  const updateThoughtMutation = useUpdateWatchingThought();
  const deleteThoughtMutation = useDeleteWatchingThought();
  const updateReplyMutation = useUpdateWatchingThoughtReply();
  const deleteReplyMutation = useDeleteWatchingThoughtReply();
  const { data: currentUser } = useCurrentUser();
  const name = thought.user.displayName || thought.user.username || "Unknown";
  const canManageThought = !!currentUser?.id && currentUser.id === thought.user.id;
  const isLive = thought.sessionStatus === "WATCHING_NOW";
  const mergedReplies = useMemo(() => [...optimisticReplies, ...(replies ?? [])], [optimisticReplies, replies]);
  const repliesByParent = useMemo(() => {
    const map = new Map<string, typeof mergedReplies>();
    for (const reply of mergedReplies) {
      const key = reply.parentReplyId ?? "root";
      const list = map.get(key) ?? [];
      list.push(reply);
      map.set(key, list);
    }
    return map;
  }, [mergedReplies]);
  const topLevelReplies = repliesByParent.get("root") ?? [];
  const visibleReplies = expandReplies ? topLevelReplies : topLevelReplies.slice(0, 10);
  const hasMoreReplies = topLevelReplies.length > 10;
  const shouldBlurSpoiler = blurred && !isSpoilerRevealed;

  // Keep local counters synced with live query updates/pusher refreshes.
  useEffect(() => {
    setLocalReactionCount(thought.reactionCount);
    setLocalReplyCount(thought.replyCount);
    setLocalMyReactions(thought.myReactions ?? []);
    setEditText(thought.content);
    if (!blurred) setIsSpoilerRevealed(false);
  }, [thought.reactionCount, thought.replyCount, thought.myReactions, blurred]);

  const handleReactionToggle = async (reactionType: string) => {
    const previousReactions = [...localMyReactions];
    const hasReaction = previousReactions.includes(reactionType);
    setLocalMyReactions((prev) =>
      hasReaction ? prev.filter((reaction) => reaction !== reactionType) : [...prev, reactionType]
    );
    setLocalReactionCount((count) => Math.max(0, hasReaction ? count - 1 : count + 1));
    try {
      if (hasReaction) {
        await removeMutation.mutateAsync({ thoughtId: thought.thoughtId, reactionType });
      } else {
        await addMutation.mutateAsync({ thoughtId: thought.thoughtId, reactionType });
      }
    } catch (error) {
      // rollback optimistic update
      setLocalMyReactions(previousReactions);
      setLocalReactionCount((count) => Math.max(0, hasReaction ? count + 1 : count - 1));
      toast.error(error instanceof Error ? error.message : "Failed to update reaction");
    }
  };

  const handleReply = async () => {
    if (!replyInput.trim()) return;
    const validationError = getWatchingReplyValidationError(replyInput.trim());
    if (validationError) {
      toast.error(validationError);
      return;
    }
    const optimisticId = `temp-${Date.now()}`;
    const optimisticContent = replyInput.trim();
    setOptimisticReplies((prev) => [
      ...prev,
      {
        id: optimisticId,
        content: optimisticContent,
        user: {
          id: currentUser?.id ?? "optimistic-user",
          displayName: "You",
          username: "you",
          avatarUrl: currentUser?.avatarUrl ?? null,
        },
        parentReplyId: replyParentId,
        createdAt: new Date().toISOString(),
      },
    ]);
    setLocalReplyCount((count) => count + 1);
    setReplyInput("");
    try {
      await addReplyMutation.mutateAsync({
        thoughtId: thought.thoughtId,
        content: optimisticContent,
        parentReplyId: replyParentId,
      });
      setShowReplies(true);
      setIsReplying(false);
      setReplyParentId(null);
      setOptimisticReplies((prev) => prev.filter((reply) => reply.id !== optimisticId));
    } catch (error) {
      setOptimisticReplies((prev) => prev.filter((reply) => reply.id !== optimisticId));
      setLocalReplyCount((count) => Math.max(0, count - 1));
      toast.error(error instanceof Error ? error.message : "Failed to add reply");
    }
  };

  const handleThoughtEdit = async () => {
    const content = editText.trim();
    if (!content) return;
    const validationError = getWatchingThoughtValidationError(content);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      await updateThoughtMutation.mutateAsync({ thoughtId: thought.thoughtId, content });
      setIsEditing(false);
      toast.success("Comment updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update comment");
    }
  };

  const handleReplyEdit = async () => {
    if (!replyEditState) return;
    const content = replyEditState.content.trim();
    if (!content) return;
    const validationError = getWatchingReplyValidationError(content);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      await updateReplyMutation.mutateAsync({
        thoughtId: thought.thoughtId,
        replyId: replyEditState.id,
        content,
      });
      setReplyEditState(null);
      toast.success("Reply updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update reply");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "thought") {
        await deleteThoughtMutation.mutateAsync({ thoughtId: thought.thoughtId });
        toast.success("Comment deleted.");
      } else {
        await deleteReplyMutation.mutateAsync({ thoughtId: thought.thoughtId, replyId: deleteTarget.id });
        toast.success("Reply deleted.");
      }
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete item");
    }
  };

  return (
    <div
      id={`thought-${thought.thoughtId}`}
      className={`px-[2px] py-[2px] ${
        highlighted ? "rounded-[12px] ring-2 ring-emerald-500/60 bg-emerald-500/10 animate-pulse" : ""
      }`}
    >
      <div className="flex items-start gap-[10px]">
        <Avatar className="mt-0.5 h-7 w-7 shrink-0">
          <AvatarImage src={thought.user.avatarUrl ?? undefined} alt={name} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className="truncate text-[13px] font-medium text-foreground">{name}</span>
            <span>·</span>
            <span>{timeAgo(thought.createdAt)}</span>
            {showEpisodeContext ? (
              <>
                <span>·</span>
                <span className="inline-flex items-center rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/90">
                  {formatEpisodeTag(thought.seasonNumber, thought.episodeNumber)}
                </span>
              </>
            ) : null}
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
            {canManageThought ? (
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
                      setEditText(thought.content);
                    }}
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => setDeleteTarget({ type: "thought", id: thought.thoughtId })}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          <div>
            {shouldBlurSpoiler ? (
              <div className="mb-1">
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
                    className="h-8 cursor-pointer rounded-[20px] px-3 text-xs"
                    onClick={handleThoughtEdit}
                    disabled={updateThoughtMutation.isPending || !editText.trim()}
                  >
                    {updateThoughtMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs text-muted-foreground hover:bg-muted"
                    onClick={() => {
                      setIsEditing(false);
                      setEditText(thought.content);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSpoilerRevealed(true)}
                className="w-full cursor-pointer text-left"
              >
                <p className={`text-[13px] text-foreground ${shouldBlurSpoiler ? "select-none blur-sm" : ""}`}>
                  {shouldBlurSpoiler ? "Tap to reveal spoiler comment" : thought.content}
                </p>
              </button>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
                onClick={() => setShowReactionPicker((v) => !v)}
                disabled={addMutation.isPending || removeMutation.isPending || shouldBlurSpoiler}
              >
                <Smile className="h-3.5 w-3.5" /> {localReactionCount}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
                onClick={() => {
                  setShowReplies(true);
                  setIsReplying((v) => !v);
                  setReplyParentId(null);
                  if (isReplying) {
                    setReplyInput("");
                  }
                }}
              >
                <Reply className="h-3.5 w-3.5" /> Reply ({localReplyCount})
              </Button>
            </div>

            {showReactionPicker ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {EMOJI_REACTIONS.map((reactionType) => {
                  const selected = localMyReactions.includes(reactionType);
                  return (
                    <button
                      key={reactionType}
                      type="button"
                      className={`h-7 rounded-[20px] border border-border/60 px-3 text-xs font-medium cursor-pointer ${
                        selected ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"
                      }`}
                      onClick={() => handleReactionToggle(reactionType)}
                      disabled={addMutation.isPending || removeMutation.isPending || shouldBlurSpoiler}
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

        {showReplies ? (
          <div className="mt-1 space-y-2">
          {visibleReplies.map((reply) => {
            const replyUser = reply.user.displayName || reply.user.username || "Unknown";
            const isOptimistic = String(reply.id).startsWith("temp-");
            const nestedReplies = repliesByParent.get(reply.id) ?? [];
            return (
              <div key={reply.id} className={`flex items-start gap-[10px] ${isOptimistic ? "opacity-80" : ""}`}>
                <Avatar className="mt-0.5 h-6 w-6 shrink-0">
                  <AvatarImage src={reply.user.avatarUrl ?? undefined} alt={replyUser} />
                  <AvatarFallback>{replyUser[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                    <span className="truncate text-[13px] font-medium text-foreground">{replyUser}</span>
                    <span>·</span>
                    <span>{timeAgo(reply.createdAt)}</span>
                    {!!currentUser?.id && currentUser.id === reply.user.id ? (
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
                          className="h-7 cursor-pointer rounded-[20px] px-2 text-[11px]"
                          onClick={handleReplyEdit}
                          disabled={updateReplyMutation.isPending || !replyEditState.content.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 cursor-pointer rounded-[20px] border border-border/60 px-2 text-[11px] text-muted-foreground hover:bg-muted"
                          onClick={() => setReplyEditState(null)}
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
                      className="h-7 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
                      onClick={() => setShowReactionPicker((v) => !v)}
                      disabled={addMutation.isPending || removeMutation.isPending || shouldBlurSpoiler}
                    >
                      <Smile className="h-3.5 w-3.5" /> {localReactionCount}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
                      onClick={() => {
                        setShowReplies(true);
                        setIsReplying(true);
                        setReplyParentId(reply.id);
                        setReplyInput(`@${replyUser} `);
                      }}
                    >
                      <Reply className="h-3.5 w-3.5" /> Reply ({nestedReplies.length})
                    </Button>
                  </div>
                {nestedReplies.length ? (
                  <div className="space-y-1 border-l border-border/50 pl-3">
                    {nestedReplies.slice(0, 2).map((nested) => {
                      const nestedUser = nested.user.displayName || nested.user.username || "Unknown";
                      return (
                        <div key={nested.id}>
                          <span className="font-medium text-foreground/90">{nestedUser}</span>
                          <span className="mx-1">·</span>
                          <span>{nested.content}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              </div>
            );
          })}
          {hasMoreReplies ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpandReplies((v) => !v)}
              className="h-7 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              {expandReplies ? "Show less" : `Show more (${topLevelReplies.length - 10})`}
            </Button>
          ) : null}
          {isReplying ? (
            <div className="flex items-center gap-2">
              <Input
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                placeholder="Write a reply..."
                className="h-8 border-border/60 bg-transparent text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                size="sm"
                className="h-8 cursor-pointer rounded-[20px] px-3 text-xs"
                onClick={handleReply}
                disabled={addReplyMutation.isPending || !replyInput.trim()}
              >
                <Reply className="h-3.5 w-3.5" /> Reply
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 cursor-pointer rounded-[20px] border border-border/60 px-3 text-xs text-muted-foreground hover:bg-muted"
                onClick={() => {
                  setIsReplying(false);
                  setReplyParentId(null);
                  setReplyInput("");
                }}
              >
                Cancel
              </Button>
            </div>
          ) : null}
          </div>
        ) : null}
          </div>
        </div>
      </div>
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
              onClick={handleConfirmDelete}
            >
              {(deleteThoughtMutation.isPending || deleteReplyMutation.isPending) ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function WatchingDiscussionsSection({
  data,
  isLoading,
  focusThoughtId,
  titleContext,
}: {
  data: WatchingTitlePresenceResponse | undefined;
  isLoading: boolean;
  focusThoughtId?: string | null;
  titleContext: {
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string | null;
    backdropPath: string | null;
  };
}) {
  const [showSpoilers, setShowSpoilers] = useState(false);
  const [episodeFilter, setEpisodeFilter] = useState<string>("all");
  const [highlightedThoughtId, setHighlightedThoughtId] = useState<string | null>(null);
  const [discussionComposerOpen, setDiscussionComposerOpen] = useState(false);
  const [discussionDraft, setDiscussionDraft] = useState("");
  const [discussionSpoiler, setDiscussionSpoiler] = useState(false);
  const [discussionSort, setDiscussionSort] = useState<DiscussionSort>("newest");
  const [discussionSearchQuery, setDiscussionSearchQuery] = useState("");
  const watchingMutation = useWatchingMutation();
  const { data: currentUser } = useCurrentUser();

  const episodeFilters = useMemo(() => {
    if (titleContext.mediaType !== "tv") return [];
    const combined = [...(data?.recentThoughts ?? []), ...(data?.spoilerThoughts ?? [])];
    const unique = new Map<string, { seasonNumber: number | null; episodeNumber: number | null }>();
    for (const thought of combined) {
      const key = `${thought.seasonNumber ?? "null"}-${thought.episodeNumber ?? "null"}`;
      if (!unique.has(key)) {
        unique.set(key, {
          seasonNumber: thought.seasonNumber ?? null,
          episodeNumber: thought.episodeNumber ?? null,
        });
      }
    }
    return Array.from(unique.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => {
        const seasonA = a.seasonNumber ?? Number.MAX_SAFE_INTEGER;
        const seasonB = b.seasonNumber ?? Number.MAX_SAFE_INTEGER;
        if (seasonA !== seasonB) return seasonA - seasonB;
        const episodeA = a.episodeNumber ?? Number.MAX_SAFE_INTEGER;
        const episodeB = b.episodeNumber ?? Number.MAX_SAFE_INTEGER;
        return episodeA - episodeB;
      });
  }, [data?.recentThoughts, data?.spoilerThoughts, titleContext.mediaType]);

  const filteredRecentThoughts = useMemo(() => {
    const source = data?.recentThoughts ?? [];
    if (titleContext.mediaType !== "tv" || episodeFilter === "all") return source;
    const [seasonRaw, episodeRaw] = episodeFilter.split("-");
    return source.filter(
      (thought) =>
        String(thought.seasonNumber ?? "null") === seasonRaw &&
        String(thought.episodeNumber ?? "null") === episodeRaw
    );
  }, [data?.recentThoughts, episodeFilter, titleContext.mediaType]);

  const filteredSpoilerThoughts = useMemo(() => {
    const source = data?.spoilerThoughts ?? [];
    if (titleContext.mediaType !== "tv" || episodeFilter === "all") return source;
    const [seasonRaw, episodeRaw] = episodeFilter.split("-");
    return source.filter(
      (thought) =>
        String(thought.seasonNumber ?? "null") === seasonRaw &&
        String(thought.episodeNumber ?? "null") === episodeRaw
    );
  }, [data?.spoilerThoughts, episodeFilter, titleContext.mediaType]);

  const episodePostContext = useMemo(() => {
    if (titleContext.mediaType !== "tv" || episodeFilter === "all") {
      return { seasonNumber: null as number | null, episodeNumber: null as number | null };
    }
    const [sr, er] = episodeFilter.split("-");
    const sn = sr === "null" ? Number.NaN : Number.parseInt(sr, 10);
    const en = er === "null" ? Number.NaN : Number.parseInt(er, 10);
    return {
      seasonNumber: Number.isFinite(sn) ? sn : null,
      episodeNumber: Number.isFinite(en) ? en : null,
    };
  }, [titleContext.mediaType, episodeFilter]);

  const submitTitleDiscussion = async () => {
    const trimmed = discussionDraft.trim();
    const validationError = getWatchingThoughtValidationError(trimmed);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      await watchingMutation.mutateAsync({
        action: "share_thought",
        tmdbId: titleContext.tmdbId,
        mediaType: titleContext.mediaType,
        title: titleContext.title,
        posterPath: titleContext.posterPath,
        backdropPath: titleContext.backdropPath,
        seasonNumber: episodePostContext.seasonNumber,
        episodeNumber: episodePostContext.episodeNumber,
        content: trimmed,
        spoiler: discussionSpoiler,
      });
      setDiscussionDraft("");
      setDiscussionSpoiler(false);
      setDiscussionComposerOpen(false);
      toast.success("Posted to the discussion.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post");
    }
  };

  const displayedRecentThoughts = useMemo(() => {
    let list = [...filteredRecentThoughts];
    const q =
      filteredRecentThoughts.length < 4 ? "" : discussionSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((thought) => {
        const name = (thought.user.displayName || thought.user.username || "").toLowerCase();
        return name.includes(q) || thought.content.toLowerCase().includes(q);
      });
    }
    list.sort((a, b) => {
      switch (discussionSort) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "replies":
          return b.replyCount - a.replyCount;
        case "reactions":
          return b.reactionCount - a.reactionCount;
        default:
          return 0;
      }
    });
    return list;
  }, [filteredRecentThoughts, discussionSearchQuery, discussionSort]);

  const handleWatchingToo = async () => {
    try {
      await watchingMutation.mutateAsync({
        action: "start",
        tmdbId: titleContext.tmdbId,
        mediaType: titleContext.mediaType,
        title: titleContext.title,
        posterPath: titleContext.posterPath,
        backdropPath: titleContext.backdropPath,
      });
      toast.success("You are now marked as watching this.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start watching session");
    }
  };

  useEffect(() => {
    if (!focusThoughtId) return;
    const inSpoilers = (data?.spoilerThoughts ?? []).some((thought) => thought.thoughtId === focusThoughtId);
    if (inSpoilers) setShowSpoilers(true);
    const timeout = window.setTimeout(() => {
      const target = document.getElementById(`thought-${focusThoughtId}`);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedThoughtId(focusThoughtId);
      window.setTimeout(() => setHighlightedThoughtId((current) => (current === focusThoughtId ? null : current)), 2400);
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [focusThoughtId, data?.recentThoughts, data?.spoilerThoughts]);

  useEffect(() => {
    if (titleContext.mediaType !== "tv") return;
    if (episodeFilter === "all") return;
    const exists = episodeFilters.some((option) => option.key === episodeFilter);
    if (!exists) setEpisodeFilter("all");
  }, [episodeFilters, episodeFilter, titleContext.mediaType]);

  if (isLoading) {
    return <div className="py-6 text-sm text-muted-foreground">Loading discussions...</div>;
  }

  return (
    <section className="space-y-6 py-6">
      {(data?.watcherCount ?? 0) > 0 ? (
        <div className="rounded-[15px] border border-border/60 bg-muted/25 p-3 dark:border-border/50 dark:bg-muted/15">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Watching now</p>
            <p className="text-xs text-muted-foreground">
              {data?.watcherCount ?? 0} {(data?.watcherCount ?? 0) === 1 ? "person" : "people"}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex -space-x-2">
                  {(data?.watchers ?? []).slice(0, 8).map((watcher) => {
                    const label = watcher.user.displayName || watcher.user.username || "U";
                    return (
                      <Avatar key={watcher.sessionId} className="h-8 w-8 border border-background">
                        <AvatarImage src={watcher.user.avatarUrl ?? undefined} alt={label} />
                        <AvatarFallback className="text-[10px]">{label[0]}</AvatarFallback>
                      </Avatar>
                    );
                  })}
                </div>
                <p className="truncate text-[13px] text-muted-foreground">Friends currently watching this title</p>
              </div>
              {data?.isCurrentUserWatching ? (
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  Watching now
                </span>
              ) : (
                <Button
                  size="sm"
                  className="h-8 shrink-0 cursor-pointer rounded-[20px] px-3 text-[12px]"
                  disabled={watchingMutation.isPending}
                  onClick={handleWatchingToo}
                >
                  I&apos;m watching too
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div>
        {titleContext.mediaType === "tv" ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`h-7 cursor-pointer rounded-[20px] border px-3 text-xs font-medium ${
                episodeFilter === "all"
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-border/60 text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setEpisodeFilter("all")}
            >
              All episodes
            </Button>
            {episodeFilters.map((option) => (
              <Button
                key={option.key}
                type="button"
                variant="ghost"
                size="sm"
                className={`h-7 cursor-pointer rounded-[20px] border px-3 text-xs font-medium ${
                  episodeFilter === option.key
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-border/60 text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setEpisodeFilter(option.key)}
              >
                {formatEpisodeTag(option.seasonNumber, option.episodeNumber)}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="mb-4">
          {currentUser ? (
            <JoinDiscussionComposer
              expanded={discussionComposerOpen}
              onExpandedChange={setDiscussionComposerOpen}
              content={discussionDraft}
              onContentChange={setDiscussionDraft}
              spoiler={discussionSpoiler}
              onSpoilerChange={setDiscussionSpoiler}
              onSubmit={submitTitleDiscussion}
              isSubmitting={watchingMutation.isPending}
              isTitleDiscussion={true}
            />
          ) : (
            <div className="flex flex-col gap-3 rounded-[15px] border border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-border/50 dark:bg-muted/10">
              <p className="text-sm text-muted-foreground">Sign in to share a thought and join the discussion.</p>
              <Button
                asChild
                size="sm"
                className="h-9 w-full shrink-0 cursor-pointer rounded-[20px] sm:w-auto"
              >
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          )}
        </div>

        {filteredRecentThoughts.length >= 4 ? (
          <div className="mb-3 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start sm:gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex w-fit shrink-0 cursor-pointer items-center gap-1 rounded-sm border-0 bg-transparent p-0 text-left text-sm text-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="text-muted-foreground">Sort by:</span>
                  <span>{discussionSortLabels[discussionSort]}</span>
                  <ChevronDown className="relative top-[3px] h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[12rem]">
                {(Object.keys(discussionSortLabels) as DiscussionSort[]).map((key) => (
                  <DropdownMenuItem
                    key={key}
                    className="cursor-pointer text-sm"
                    onClick={() => setDiscussionSort(key)}
                  >
                    {discussionSortLabels[key]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="relative w-full min-w-0 sm:max-w-md lg:w-80 lg:max-w-none">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={discussionSearchQuery}
                onChange={(e) => setDiscussionSearchQuery(e.target.value)}
                placeholder="Search discussions…"
                className="h-9 border-border/60 bg-transparent pl-9 text-sm"
                aria-label="Search discussions"
              />
            </div>
          </div>
        ) : null}

        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recent thoughts - no spoilers
        </h3>
        <div className="mt-3 space-y-3">
          {displayedRecentThoughts.map((thought) => (
            <ThoughtCard
              key={thought.thoughtId}
              thought={thought}
              highlighted={highlightedThoughtId === thought.thoughtId}
              showEpisodeContext={titleContext.mediaType === "tv"}
            />
          ))}
          {!filteredRecentThoughts.length ? (
            <p className="text-sm text-muted-foreground">No recent spoiler-free thoughts yet.</p>
          ) : !displayedRecentThoughts.length ? (
            <p className="text-sm text-muted-foreground">No thoughts match your search.</p>
          ) : null}
        </div>
      </div>

      {filteredSpoilerThoughts.length > 0 ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 dark:border-border/50 dark:bg-muted/10">
          <button
            type="button"
            className="text-xs font-semibold tracking-wide text-muted-foreground cursor-pointer"
            onClick={() => setShowSpoilers((v) => !v)}
          >
            Spoiler discussions - Tap to reveal
          </button>
          <div className="mt-3 space-y-3">
            {filteredSpoilerThoughts.map((thought) => (
              <ThoughtCard
                key={thought.thoughtId}
                thought={thought}
                blurred={!showSpoilers}
                highlighted={highlightedThoughtId === thought.thoughtId}
                showEpisodeContext={titleContext.mediaType === "tv"}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

