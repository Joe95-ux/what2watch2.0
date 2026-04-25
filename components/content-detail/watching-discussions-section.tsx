"use client";

import { useState } from "react";
import { MessageCircle, Smile } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const [replyInput, setReplyInput] = useState("");
  const [localReactionCount, setLocalReactionCount] = useState(thought.reactionCount);
  const [localReplyCount, setLocalReplyCount] = useState(thought.replyCount);
  const [localMyReactions, setLocalMyReactions] = useState<string[]>(thought.myReactions);
  const { data: replies } = useWatchingThoughtReplies(thought.thoughtId, showReplies);
  const [optimisticReplies, setOptimisticReplies] = useState<Array<{ id: string; user: { displayName: string | null; username: string | null }; content: string }>>([]);
  const addReplyMutation = useAddWatchingThoughtReply();
  const { addMutation, removeMutation } = useWatchingThoughtReaction();
  const name = thought.user.displayName || thought.user.username || "Unknown";
  const likedByMe = localMyReactions.includes("like");

  const handleReactionToggle = async (reactionType: string) => {
    const hasReaction = localMyReactions.includes(reactionType);
    setLocalMyReactions((prev) =>
      hasReaction ? prev.filter((reaction) => reaction !== reactionType) : [...prev, reactionType]
    );
    setLocalReactionCount((count) => (hasReaction ? Math.max(0, count - 1) : count + 1));
    try {
      if (hasReaction) {
        await removeMutation.mutateAsync({ thoughtId: thought.thoughtId, reactionType });
      } else {
        await addMutation.mutateAsync({ thoughtId: thought.thoughtId, reactionType });
      }
    } catch (error) {
      // rollback optimistic update
      setLocalMyReactions((prev) =>
        hasReaction ? [...prev, reactionType] : prev.filter((reaction) => reaction !== reactionType)
      );
      setLocalReactionCount((count) => (hasReaction ? count + 1 : Math.max(0, count - 1)));
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
    <div className="rounded-lg border border-border bg-card/70 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Avatar className="h-7 w-7">
          <AvatarImage src={thought.user.avatarUrl ?? undefined} alt={name} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{timeAgo(thought.createdAt)}</p>
        </div>
      </div>
      <p className={`text-sm text-foreground ${blurred ? "select-none blur-sm" : ""}`}>{thought.content}</p>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <button
          type="button"
          className={`inline-flex cursor-pointer items-center gap-1 ${likedByMe ? "text-foreground" : ""}`}
          onClick={() => handleReactionToggle("like")}
          disabled={addMutation.isPending || removeMutation.isPending || blurred}
        >
          <Smile className="h-3.5 w-3.5" /> {localReactionCount}
        </button>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1"
          onClick={() => setShowReplies((v) => !v)}
        >
          <MessageCircle className="h-3.5 w-3.5" /> {localReplyCount}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {EMOJI_REACTIONS.map((reactionType) => {
          const selected = localMyReactions.includes(reactionType);
          return (
            <button
              key={reactionType}
              type="button"
              className={`h-7 rounded-full border px-2 text-xs cursor-pointer ${
                selected ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"
              }`}
              onClick={() => handleReactionToggle(reactionType)}
              disabled={addMutation.isPending || removeMutation.isPending || blurred}
            >
              {reactionType === "like" ? "👍" : reactionType}
            </button>
          );
        })}
        {!!localMyReactions.length && (
          <span className="text-[11px] text-muted-foreground">
            You reacted: {localMyReactions.map((reaction) => (reaction === "like" ? "👍" : reaction)).join(" ")}
          </span>
        )}
      </div>
      {showReplies ? (
        <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
          {optimisticReplies.map((reply) => (
            <div key={reply.id} className="rounded-md bg-muted/30 px-2 py-1.5 opacity-80">
              <p className="text-xs font-medium">{reply.user.displayName || reply.user.username || "You"}</p>
              <p className="text-xs text-muted-foreground">{reply.content}</p>
            </div>
          ))}
          {(replies ?? []).map((reply) => {
            const replyUser = reply.user.displayName || reply.user.username || "Unknown";
            return (
              <div key={reply.id} className="rounded-md bg-muted/30 px-2 py-1.5">
                <p className="text-xs font-medium">{replyUser}</p>
                <p className="text-xs text-muted-foreground">{reply.content}</p>
              </div>
            );
          })}
          <div className="flex items-center gap-2">
            <Input
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              placeholder="Write a reply..."
              className="h-8 text-xs"
            />
            <Button size="sm" className="h-8 cursor-pointer" onClick={handleReply} disabled={addReplyMutation.isPending || !replyInput.trim()}>
              Reply
            </Button>
          </div>
        </div>
      ) : null}
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

      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Spoiler discussions</h3>
          <Button
            variant={showSpoilers ? "default" : "outline"}
            size="sm"
            className="h-8 cursor-pointer rounded-[20px]"
            onClick={() => setShowSpoilers((v) => !v)}
          >
            {showSpoilers ? "Hide spoilers" : "Reveal spoilers"}
          </Button>
        </div>
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

