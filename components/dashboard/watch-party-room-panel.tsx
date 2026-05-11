"use client";

import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useWatchPartyChat, useWatchPartyChatSend } from "@/hooks/use-watch-party-chat";
import { useWatchPartyReactionToggle, useWatchPartyReactions } from "@/hooks/use-watch-party-reactions";
import type { WatchPartyRoomParticipant } from "@/hooks/use-watch-party-room-summary";
import {
  WATCH_PARTY_REACTION_KINDS,
  WATCH_PARTY_REACTION_LABEL,
  type WatchPartyReactionKind,
} from "@/lib/watch-party-reaction-kinds";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type WatchPartyRoomPanelProps = {
  partyId: string;
  partyOpen: boolean;
  isParticipant: boolean;
  partyParticipants: WatchPartyRoomParticipant[];
};

export function WatchPartyRoomPanel({
  partyId,
  partyOpen,
  isParticipant,
  partyParticipants,
}: WatchPartyRoomPanelProps) {
  const queryEnabled = Boolean(partyId) && isParticipant;
  const { data: chatData, isLoading: chatLoading } = useWatchPartyChat(partyId, queryEnabled);
  const { data: reactionData, isLoading: reactionsLoading } = useWatchPartyReactions(partyId, queryEnabled);
  const sendChat = useWatchPartyChatSend(partyId);
  const toggleReaction = useWatchPartyReactionToggle(partyId);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = chatData?.messages ?? [];

  useEffect(() => {
    const el = scrollRef.current?.querySelector("[data-slot=\"scroll-area-viewport\"]");
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    try {
      await sendChat.mutateAsync(text);
      setDraft("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    }
  };

  const handleToggle = async (kind: WatchPartyReactionKind) => {
    try {
      await toggleReaction.mutateAsync(kind);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update reaction");
    }
  };

  if (!isParticipant) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-center text-[11px] text-muted-foreground">
        Join this watch room to see party chat and reactions.
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
      {partyParticipants.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Party</span>
          <div className="flex -space-x-1.5 pl-1">
            {partyParticipants.slice(0, 12).map((p) => (
              <Avatar key={p.userId} className="h-6 w-6 border border-background text-[10px]">
                <AvatarImage src={p.avatarUrl ?? undefined} alt={p.name} />
                <AvatarFallback>{p.name[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {WATCH_PARTY_REACTION_KINDS.map((kind) => {
          const count = reactionData?.counts[kind] ?? 0;
          const active = reactionData?.mine.includes(kind);
          const disabled = !partyOpen || reactionsLoading || toggleReaction.isPending;
          return (
            <Button
              key={kind}
              type="button"
              variant={active ? "secondary" : "outline"}
              size="sm"
              className={cn(
                "h-7 gap-1 rounded-full px-2 text-xs",
                active && "border-sky-500/40 bg-sky-500/10"
              )}
              disabled={disabled}
              onClick={() => void handleToggle(kind)}
            >
              <span>{WATCH_PARTY_REACTION_LABEL[kind]}</span>
              {count > 0 ? <span className="text-[10px] text-muted-foreground">{count}</span> : null}
            </Button>
          );
        })}
      </div>

      <div ref={scrollRef} className="rounded-lg border border-border/60 bg-background/50">
        <ScrollArea className="h-[min(200px,40vh)] px-2 py-2">
          {chatLoading ? (
            <p className="py-4 text-center text-[11px] text-muted-foreground">Loading chat…</p>
          ) : messages.length === 0 ? (
            <p className="py-4 text-center text-[11px] text-muted-foreground">No party messages yet.</p>
          ) : (
            <ul className="space-y-2 pr-2">
              {messages.map((m) => (
                <li key={m.id} className="flex gap-2 text-[12px]">
                  <Avatar className="mt-0.5 h-6 w-6 shrink-0">
                    <AvatarImage src={m.user.avatarUrl ?? undefined} alt={m.user.name} />
                    <AvatarFallback>{m.user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">{m.user.name}</span> ·{" "}
                      {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-foreground">{m.content}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>

      {partyOpen ? (
        <div className="flex flex-col gap-1.5">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message the party…"
            rows={2}
            maxLength={500}
            className="min-h-[52px] resize-none text-xs"
            disabled={sendChat.isPending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              className="h-7 cursor-pointer text-xs"
              disabled={sendChat.isPending || !draft.trim()}
              onClick={() => void handleSend()}
            >
              {sendChat.isPending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">This party has ended — chat is read-only.</p>
      )}
    </div>
  );
}
