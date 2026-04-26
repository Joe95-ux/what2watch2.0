"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Smile } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WatchingTitlePresenceResponse } from "@/lib/watching-types";
import {
  useAddWatchingThoughtReply,
  useWatchingThoughtReaction,
  useWatchingThoughtReplies,
} from "@/hooks/use-watching";
import { Input } from "@/components/ui/input";
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
  const [replyInput, setReplyInput] = useState("");
  const [localReactionCount, setLocalReactionCount] = useState(thought.reactionCount);
  const [localReplyCount, setLocalReplyCount] = useState(thought.replyCount);
  const [localMyReaction, setLocalMyReaction] = useState<string | null>(thought.myReactions[0] ?? null);
  const { data: replies } = useWatchingThoughtReplies(thought.thoughtId, showReplies);
  const [optimisticReplies, setOptimisticReplies] = useState<Array<{ id: string; user: { displayName: string | null; username: string | null }; content: string }>>([]);
  const addReplyMutation = useAddWatchingThoughtReply();
  const { addMutation, removeMutation } = useWatchingThoughtReaction();
  const name = thought.user.displayName || thought.user.username || "Unknown";
  const isLive = thought.sessionStatus === "WATCHING_NOW";
  const mergedReplies = useMemo(
    () => [...optimisticReplies, ...(replies ?? [])],
    [optimisticReplies, replies]
  );
  const visibleReplies = expandReplies ? mergedReplies : mergedReplies.slice(0, 10);
  const hasMoreReplies = mergedReplies.length > 10;

  const handleReactionToggle = async (reactionType: string) => {
    const previousReaction = localMyReaction;
    const hasReaction = previousReaction === reactionType;
    setLocalMyReaction(hasReaction ? null : reactionType);
    setLocalReactionCount((count) => {
      if (hasReaction) return Math.max(0, count - 1);
      if (previousReaction) return count;
      return count + 1;
    });
    try {
      if (hasReaction) {
        await removeMutation.mutateAsync({ thoughtId: thought.thoughtId, reactionType });
      } else {
        if (previousReaction && previousReaction !== reactionType) {
          await removeMutation.mutateAsync({ thoughtId: thought.thoughtId, reactionType: previousReaction });
        }
        await addMutation.mutateAsync({ thoughtId: thought.thoughtId, reactionType });
      }
    } catch (error) {
      // rollback optimistic update
      setLocalMyReaction(previousReaction);
      setLocalReactionCount((count) => {
        if (hasReaction) return count + 1;
        if (previousReaction) return count;
        return Math.max(0, count - 1);
      });
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
        user: { displayName: "You", username: "you" },
      },
    ]);
    setLocalReplyCount((count) => count + 1);
    setReplyInput("");
    try {
      await addReplyMutation.mutateAsync({
        thoughtId: thought.thoughtId,
        content: optimisticContent,
      });
      setShowReplies(true);
      setOptimisticReplies((prev) => prev.filter((reply) => reply.id !== optimisticId));
    } catch (error) {
      setOptimisticReplies((prev) => prev.filter((reply) => reply.id !== optimisticId));
      setLocalReplyCount((count) => Math.max(0, count - 1));
      toast.error(error instanceof Error ? error.message : "Failed to add reply");
    }
  };

  return (
    <div className="space-y-2 px-[2px] py-[2px]">
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
        <Avatar className="h-6 w-6">
          <AvatarImage src={thought.user.avatarUrl ?? undefined} alt={name} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <span className="truncate text-[13px] font-medium text-foreground">{name}</span>
        <span>·</span>
        <span>{timeAgo(thought.createdAt)}</span>
        <span>·</span>
        {isLive ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            LIVE
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/80" />
            FINISHED
          </span>
        )}
      </div>

      <div>
        {blurred ? (
          <div className="mb-1">
            <Badge variant="secondary" className="rounded-full bg-amber-500/15 text-[10px] text-amber-600 dark:text-amber-400">
              Spoiler discussion
            </Badge>
          </div>
        ) : null}
        <p className={`text-[13px] text-foreground ${blurred ? "select-none blur-sm" : ""}`}>{thought.content}</p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 cursor-pointer rounded-[20px] px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
            onClick={() => handleReactionToggle("like")}
            disabled={addMutation.isPending || removeMutation.isPending || blurred}
          >
            <Smile className="h-3.5 w-3.5" /> {localReactionCount}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 cursor-pointer rounded-[20px] px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
            onClick={() => setShowReplies((v) => !v)}
          >
            <MessageCircle className="h-3.5 w-3.5" /> Reply ({localReplyCount})
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {EMOJI_REACTIONS.map((reactionType) => {
            const selected = localMyReaction === reactionType;
            return (
              <button
                key={reactionType}
                type="button"
                className={`h-7 rounded-[20px] border border-border/60 px-3 text-xs font-medium cursor-pointer ${
                  selected ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"
                }`}
                onClick={() => handleReactionToggle(reactionType)}
                disabled={addMutation.isPending || removeMutation.isPending || blurred}
              >
                {reactionType === "like" ? "👍" : reactionType}
              </button>
            );
          })}
          {localMyReaction ? (
            <span className="text-[11px] text-muted-foreground">
              You reacted: {localMyReaction === "like" ? "👍" : localMyReaction}
            </span>
          ) : null}
        </div>

        {showReplies ? (
          <div className="mt-1 space-y-2">
          {visibleReplies.map((reply) => {
            const replyUser = reply.user.displayName || reply.user.username || "Unknown";
            const isOptimistic = String(reply.id).startsWith("temp-");
            return (
              <div key={reply.id} className={`rounded-md bg-muted/25 px-2 py-1.5 ${isOptimistic ? "opacity-80" : ""}`}>
                <p className="text-xs font-medium">{replyUser}</p>
                <p className="text-xs text-muted-foreground">{reply.content}</p>
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
              {expandReplies ? "Show less" : `Show more (${mergedReplies.length - 10})`}
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
              Reply
            </Button>
          </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function WatchingDiscussionsSection({
  data,
  isLoading,
}: {
  data: WatchingTitlePresenceResponse | undefined;
  isLoading: boolean;
}) {
  const [showSpoilers, setShowSpoilers] = useState(false);

  if (isLoading) {
    return <div className="py-6 text-sm text-muted-foreground">Loading discussions...</div>;
  }

  return (
    <section className="space-y-6 py-6">
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

      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 dark:border-border/50 dark:bg-muted/10">
        <button
          type="button"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer"
          onClick={() => setShowSpoilers((v) => !v)}
        >
          SPOILER DISCUSSIONS - tap to reveal
        </button>
        <div className="mt-3 space-y-3">
          {(data?.spoilerThoughts ?? []).map((thought) => (
            <ThoughtCard key={thought.thoughtId} thought={thought} blurred={!showSpoilers} />
          ))}
          {!(data?.spoilerThoughts?.length ?? 0) ? (
            <p className="text-sm text-muted-foreground">No spoiler discussions yet.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

