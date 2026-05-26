"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, formatDistanceToNow, isValid } from "date-fns";
import { Calendar, Pin, X } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useWatchPartyChat, useWatchPartyChatSend } from "@/hooks/use-watch-party-chat";
import {
  useWatchPartyMarkerPin,
  useWatchPartyMarkerUnpin,
  useWatchPartyMarkers,
} from "@/hooks/use-watch-party-markers";
import {
  useWatchPartyScheduleCreate,
  useWatchPartyScheduleDelete,
  useWatchPartySchedules,
} from "@/hooks/use-watch-party-schedules";
import { useWatchPartyReactionPulse, useWatchPartyReactions } from "@/hooks/use-watch-party-reactions";
import type { WatchPartyRoomParticipant } from "@/hooks/use-watch-party-room-summary";
import {
  WATCH_PARTY_REACTION_KINDS,
  WATCH_PARTY_REACTION_LABEL,
  type WatchPartyReactionKind,
} from "@/lib/watch-party-reaction-kinds";
import { WatchPartyParticipantsRow } from "@/components/dashboard/watch-party-participants-row";
import { WatchPartyHostControlsBar } from "@/components/dashboard/watch-party-host-controls-bar";
import type { WatchPartyHostControls } from "@/lib/watch-party/host-controls";
import {
  formatPartyTimestampLabel,
  getPartyChatAnchorTimestampSec,
} from "@/lib/watch-party/message-timestamp";
import {
  formatPulseGroupLine,
  groupReactionPulsesByMoment,
} from "@/lib/watch-party/reaction-pulses";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type HostPlaybackSnapshot = {
  progressPercent: number;
  elapsedMinutes: number;
  runtimeMinutes: number | null;
};

type WatchPartyRoomPanelProps = {
  partyId: string;
  partyOpen: boolean;
  isParticipant: boolean;
  mediaType: "movie" | "tv";
  isHost?: boolean;
  hostControls?: WatchPartyHostControls | null;
  hostPlaybackSnapshot?: HostPlaybackSnapshot | null;
  /** Current user's playback on this title (guest anchor when host has not synced). */
  userPlaybackSnapshot?: HostPlaybackSnapshot | null;
  /** True while membership is being confirmed after landing or copying an invite link. */
  isJoining?: boolean;
  partyParticipants: WatchPartyRoomParticipant[];
  /** Host user id for schedule queries. */
  hostUserId?: string | null;
  scheduleTitle?: {
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string | null;
    seasonNumber: number | null;
    episodeNumber: number | null;
  } | null;
};

export function WatchPartyRoomPanel({
  partyId,
  partyOpen,
  isParticipant,
  mediaType,
  isHost = false,
  hostControls = null,
  hostPlaybackSnapshot = null,
  userPlaybackSnapshot = null,
  isJoining = false,
  partyParticipants,
  hostUserId = null,
  scheduleTitle = null,
}: WatchPartyRoomPanelProps) {
  const members = partyParticipants ?? [];
  const queryEnabled = Boolean(partyId) && isParticipant;
  const { data: currentUser } = useCurrentUser();
  const { data: chatData, isLoading: chatLoading } = useWatchPartyChat(partyId, queryEnabled);
  const { data: reactionData, isLoading: reactionsLoading } = useWatchPartyReactions(partyId, queryEnabled);
  const { data: markersData, isLoading: markersLoading } = useWatchPartyMarkers(partyId, queryEnabled);
  const sendChat = useWatchPartyChatSend(partyId, {
    currentUser: currentUser
      ? {
          id: currentUser.id,
          name: currentUser.displayName || currentUser.username || "You",
          avatarUrl: currentUser.avatarUrl ?? null,
        }
      : null,
  });
  const chatAnchorTimestampSec = useMemo(
    () =>
      getPartyChatAnchorTimestampSec({
        hostControls,
        selfPlaybackSnapshot: userPlaybackSnapshot,
        hostPlaybackSnapshot,
      }),
    [hostControls, hostPlaybackSnapshot, userPlaybackSnapshot]
  );
  const chatAnchorLabel = formatPartyTimestampLabel(chatAnchorTimestampSec);
  const sendPulse = useWatchPartyReactionPulse(partyId);
  const pinMarker = useWatchPartyMarkerPin(partyId);
  const unpinMarker = useWatchPartyMarkerUnpin(partyId);
  const scheduleQuery = useWatchPartySchedules(
    {
      hostUserId,
      tmdbId: scheduleTitle?.tmdbId ?? null,
      mediaType: scheduleTitle?.mediaType ?? null,
    },
    Boolean(hostUserId && scheduleTitle)
  );
  const createSchedule = useWatchPartyScheduleCreate();
  const deleteSchedule = useWatchPartyScheduleDelete();
  const [draft, setDraft] = useState("");
  const [markerLabel, setMarkerLabel] = useState("");
  const [scheduleAtLocal, setScheduleAtLocal] = useState("");
  const [scheduleWeekly, setScheduleWeekly] = useState(false);
  const [scheduleNote, setScheduleNote] = useState("");
  const [pendingPulseKinds, setPendingPulseKinds] = useState<Set<WatchPartyReactionKind>>(() => new Set());
  const [burstKinds, setBurstKinds] = useState<Set<WatchPartyReactionKind>>(() => new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const pulseGroups = useMemo(
    () => groupReactionPulsesByMoment(reactionData?.recentPulses ?? []),
    [reactionData?.recentPulses]
  );
  const markers = markersData?.markers ?? [];
  const schedules = scheduleQuery.data?.schedules ?? [];

  const messages = chatData?.messages ?? [];

  useEffect(() => {
    const el = scrollRef.current?.querySelector("[data-slot=\"scroll-area-viewport\"]");
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    try {
      await sendChat.mutateAsync({
        content: text,
        timestampSec: chatAnchorTimestampSec,
      });
      setDraft("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    }
  };

  const handlePulse = async (kind: WatchPartyReactionKind) => {
    if (pendingPulseKinds.has(kind) || !partyOpen) return;
    setPendingPulseKinds((prev) => new Set(prev).add(kind));
    setBurstKinds((prev) => new Set(prev).add(kind));
    window.setTimeout(() => {
      setBurstKinds((prev) => {
        const next = new Set(prev);
        next.delete(kind);
        return next;
      });
    }, 700);
    try {
      await sendPulse.mutateAsync({ kind, timestampSec: chatAnchorTimestampSec });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send reaction");
    } finally {
      setPendingPulseKinds((prev) => {
        const next = new Set(prev);
        next.delete(kind);
        return next;
      });
    }
  };

  const handlePinMoment = async () => {
    if (!chatAnchorTimestampSec) {
      toast.error("Sync playback or start watching to pin a moment.");
      return;
    }
    try {
      await pinMarker.mutateAsync({
        label: markerLabel.trim() || undefined,
        timestampSec: chatAnchorTimestampSec,
      });
      setMarkerLabel("");
      toast.success("Moment pinned.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not pin moment");
    }
  };

  const handleAddSchedule = async () => {
    if (!scheduleTitle || !scheduleAtLocal) {
      toast.error("Pick a date and time for your next session.");
      return;
    }
    const scheduledAt = new Date(scheduleAtLocal);
    if (Number.isNaN(scheduledAt.getTime())) {
      toast.error("Invalid date/time.");
      return;
    }
    try {
      await createSchedule.mutateAsync({
        tmdbId: scheduleTitle.tmdbId,
        mediaType: scheduleTitle.mediaType,
        title: scheduleTitle.title,
        posterPath: scheduleTitle.posterPath,
        seasonNumber: scheduleTitle.seasonNumber,
        episodeNumber: scheduleTitle.episodeNumber,
        scheduledAt: scheduledAt.toISOString(),
        recurrence: scheduleWeekly ? "WEEKLY" : "NONE",
        note: scheduleNote.trim() || null,
      });
      setScheduleAtLocal("");
      setScheduleNote("");
      setScheduleWeekly(false);
      toast.success("Session scheduled.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not schedule");
    }
  };

  const handleUnpinMoment = async (markerId: string) => {
    try {
      await unpinMarker.mutateAsync(markerId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove marker");
    }
  };

  if (!isParticipant) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-center text-[11px] text-muted-foreground">
        {isJoining
          ? "Joining watch party…"
          : "Join this watch party to use chat and reactions. If the host ended it, ask for a new invite link."}
      </div>
    );
  }

  return (
    <div
      className="mt-3 space-y-2"
      data-watch-party-panel
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <WatchPartyParticipantsRow participants={members} variant="panel" />

      <WatchPartyHostControlsBar
        partyId={partyId}
        partyOpen={partyOpen}
        isHost={isHost}
        mediaType={mediaType}
        hostControls={hostControls}
        hostPlaybackSnapshot={hostPlaybackSnapshot}
      />

      {schedules.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-border/60 bg-muted/10 px-2.5 py-2">
          <p className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Upcoming sessions
          </p>
          {schedules.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-2 text-[11px]">
              <div className="min-w-0">
                <span className="font-medium text-foreground">
                  {isValid(new Date(item.scheduledAt))
                    ? format(new Date(item.scheduledAt), "MMM d · h:mm a")
                    : "Scheduled"}
                </span>
                {item.recurrence === "WEEKLY" ? (
                  <span className="text-muted-foreground"> · weekly</span>
                ) : null}
                {item.note ? <span className="text-muted-foreground"> — {item.note}</span> : null}
              </div>
              {isHost ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 cursor-pointer rounded-full"
                  disabled={deleteSchedule.isPending}
                  aria-label="Remove schedule"
                  onClick={() => void deleteSchedule.mutateAsync(item.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {isHost && partyOpen && scheduleTitle ? (
        <div className="rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2 space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground">Schedule next session</p>
          <Input
            type="datetime-local"
            value={scheduleAtLocal}
            onChange={(e) => setScheduleAtLocal(e.target.value)}
            className="h-8 text-xs"
            disabled={createSchedule.isPending}
            onClick={(e) => e.stopPropagation()}
          />
          <Input
            value={scheduleNote}
            onChange={(e) => setScheduleNote(e.target.value)}
            placeholder="Optional note for followers…"
            maxLength={120}
            className="h-8 text-xs"
            disabled={createSchedule.isPending}
            onClick={(e) => e.stopPropagation()}
          />
          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
            <Checkbox
              checked={scheduleWeekly}
              onCheckedChange={(v) => setScheduleWeekly(v === true)}
              disabled={createSchedule.isPending}
            />
            Repeats weekly
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 w-full cursor-pointer rounded-full text-xs"
            disabled={createSchedule.isPending || !scheduleAtLocal}
            onClick={() => void handleAddSchedule()}
          >
            {createSchedule.isPending ? "Saving…" : "Add to schedule"}
          </Button>
        </div>
      ) : null}

      {isHost && partyOpen ? (
        <div className="rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2 space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground">Pin a moment</p>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
            <Input
              value={markerLabel}
              onChange={(e) => setMarkerLabel(e.target.value)}
              placeholder={chatAnchorLabel ? `Label (${chatAnchorLabel})…` : "Label optional…"}
              maxLength={80}
              className="h-8 flex-1 text-xs"
              disabled={pinMarker.isPending || markersLoading}
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 cursor-pointer gap-1 rounded-full text-xs"
              disabled={pinMarker.isPending || !chatAnchorTimestampSec}
              onClick={() => void handlePinMoment()}
            >
              <Pin className="h-3.5 w-3.5" />
              {pinMarker.isPending ? "Pinning…" : "Pin moment"}
            </Button>
          </div>
        </div>
      ) : null}

      {markers.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-border/60 bg-muted/10 px-2.5 py-2">
          <p className="text-[10px] font-medium text-muted-foreground">Pinned moments</p>
          {markers.map((marker) => {
            const momentLabel = formatPartyTimestampLabel(marker.timestampSec);
            return (
              <li
                key={marker.id}
                className="flex items-start justify-between gap-2 text-[11px]"
              >
                <div className="min-w-0">
                  <span className="font-medium text-foreground">
                    {momentLabel ?? "Moment"}
                  </span>
                  {marker.label ? (
                    <span className="text-muted-foreground"> — {marker.label}</span>
                  ) : null}
                </div>
                {isHost && partyOpen ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 cursor-pointer rounded-full"
                    disabled={unpinMarker.isPending}
                    aria-label="Remove marker"
                    onClick={() => void handleUnpinMoment(marker.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <div>
        <p className="mb-1 text-[10px] text-muted-foreground">
          Tap to send a reaction pulse{chatAnchorLabel ? ` (${chatAnchorLabel})` : ""}.
        </p>
        <div className="flex flex-wrap gap-1">
          {WATCH_PARTY_REACTION_KINDS.map((kind) => {
            const count = reactionData?.counts?.[kind] ?? 0;
            const bursting = burstKinds.has(kind);
            const disabled =
              !partyOpen || reactionsLoading || pendingPulseKinds.has(kind);
            return (
              <Button
                key={kind}
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 gap-1 rounded-full px-2 text-xs cursor-pointer transition-transform",
                  bursting && "scale-110 border-amber-500/50 bg-amber-500/15"
                )}
                disabled={disabled}
                onClick={() => void handlePulse(kind)}
              >
                <span>{WATCH_PARTY_REACTION_LABEL[kind]}</span>
                {count > 0 ? <span className="text-[10px] text-muted-foreground">{count}</span> : null}
              </Button>
            );
          })}
        </div>
        {pulseGroups.length > 0 ? (
          <ul className="mt-2 space-y-0.5">
            {pulseGroups.map((group) => (
              <li key={group.momentKey} className="truncate text-[10px] text-muted-foreground">
                {formatPulseGroupLine(group)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div ref={scrollRef} className="rounded-lg border border-border/60 bg-background/50">
        <ScrollArea className="h-[min(200px,40vh)] px-2 py-2">
          {chatLoading ? (
            <div className="flex min-h-[min(200px,40vh)] items-center justify-center">
              <p className="text-center text-[11px] text-muted-foreground">Loading chat…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex min-h-[min(200px,40vh)] items-center justify-center">
              <p className="text-center text-[11px] text-muted-foreground">No party messages yet.</p>
            </div>
          ) : (
            <ul className="space-y-2 pr-2">
              {messages.map((m) => {
                const momentLabel = formatPartyTimestampLabel(m.timestampSec);
                return (
                  <li key={m.id} className="flex gap-2 text-[12px]">
                    <Avatar className="mt-0.5 h-6 w-6 shrink-0">
                      <AvatarImage src={m.user.avatarUrl ?? undefined} alt={m.user.name} />
                      <AvatarFallback>{m.user.name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">{m.user.name}</span>
                        {momentLabel ? (
                          <>
                            {" "}
                            <span className="rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
                              {momentLabel}
                            </span>
                          </>
                        ) : null}
                        {" · "}
                        {isValid(new Date(m.createdAt))
                          ? formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })
                          : "recently"}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-foreground">{m.content}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </div>

      {partyOpen ? (
        <div className="flex flex-col gap-1.5">
          {chatAnchorLabel ? (
            <p className="text-[10px] text-muted-foreground">
              New messages tag the party timeline ({chatAnchorLabel}).
              {isHost && !hostControls ? " Sync playback so guests see the same anchor." : null}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              {isHost
                ? "Sync playback to tag messages with a watch position."
                : "When the host syncs playback, messages will show where you are in the title."}
            </p>
          )}
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message the party…"
            rows={2}
            maxLength={500}
            className="min-h-[52px] resize-none text-xs"
            disabled={sendChat.isPending}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            onClick={(e) => e.stopPropagation()}
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
