"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Reply, Smile, Trash2 } from "lucide-react";
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

function ThoughtCard({
  thought,
  blurred = false,
}: {
  thought: WatchingTitlePresenceResponse["recentThoughts"][number] | WatchingTitlePresenceResponse["spoilerThoughts"][number];
  blurred?: boolean;
}) {
  const [showReplies, setShowReplies] = useState(false);
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
      user: { id: string; displayName: string | null; username: string | null };
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
    const optimisticId = `temp-${Date.now()}`;
    const optimisticContent = replyInput.trim();
    setOptimisticReplies((prev) => [
      ...prev,
      {
        id: optimisticId,
        content: optimisticContent,
        user: { id: currentUser?.id ?? "optimistic-user", displayName: "You", username: "you" },
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
    <div className="px-[2px] py-[2px]">
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
                  setShowReplies((v) => !v);
                  setReplyParentId(null);
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
              <div key={reply.id} className={`space-y-1 text-xs text-muted-foreground ${isOptimistic ? "opacity-80" : ""}`}>
                <div>
                  <span className="font-medium text-foreground/90">{replyUser}</span>
                  <span className="mx-1">·</span>
                  {replyEditState?.id === reply.id ? (
                    <span className="inline-flex items-center gap-2">
                      <Input
                        value={replyEditState.content}
                        onChange={(e) => setReplyEditState({ id: reply.id, content: e.target.value })}
                        className="h-7 border-border/60 bg-transparent text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 cursor-pointer rounded-[20px] px-2 text-[11px]"
                        onClick={handleReplyEdit}
                        disabled={updateReplyMutation.isPending || !replyEditState.content.trim()}
                      >
                        Save
                      </Button>
                    </span>
                  ) : (
                    <span>{reply.content}</span>
                  )}
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
                <button
                  type="button"
                  onClick={() => {
                    setReplyParentId(reply.id);
                    setReplyInput(`@${replyUser} `);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <Reply className="h-3 w-3" /> Reply
                </button>
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
          </div>
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
  titleContext,
}: {
  data: WatchingTitlePresenceResponse | undefined;
  isLoading: boolean;
  titleContext: {
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string | null;
    backdropPath: string | null;
  };
}) {
  const [showSpoilers, setShowSpoilers] = useState(false);
  const watchingMutation = useWatchingMutation();

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
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recent thoughts - no spoilers
        </h3>
        <div className="mt-3 space-y-3">
          {(data?.recentThoughts ?? []).map((thought) => (
            <ThoughtCard key={thought.thoughtId} thought={thought} />
          ))}
          {!(data?.recentThoughts?.length ?? 0) ? (
            <p className="text-sm text-muted-foreground">No recent spoiler-free thoughts yet.</p>
          ) : null}
        </div>
      </div>

      {(data?.spoilerThoughts?.length ?? 0) > 0 ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 dark:border-border/50 dark:bg-muted/10">
          <button
            type="button"
            className="text-xs font-semibold tracking-wide text-muted-foreground cursor-pointer"
            onClick={() => setShowSpoilers((v) => !v)}
          >
            Spoiler discussions - Tap to reveal
          </button>
          <div className="mt-3 space-y-3">
            {(data?.spoilerThoughts ?? []).map((thought) => (
              <ThoughtCard key={thought.thoughtId} thought={thought} blurred={!showSpoilers} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

