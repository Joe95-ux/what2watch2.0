"use client";

import { formatDistanceToNow, isValid } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  buildPlaybackSnapshotFromSession,
  formatHostSyncLabel,
  type WatchPartyHostControls,
} from "@/lib/watch-party/host-controls";
import { useWatchPartyHostControlsSync } from "@/hooks/use-watch-party-host-controls";
import { cn } from "@/lib/utils";

type HostPlaybackSnapshot = {
  progressPercent: number;
  elapsedMinutes: number;
  runtimeMinutes: number | null;
};

type WatchPartyHostControlsBarProps = {
  partyId: string;
  partyOpen: boolean;
  isHost: boolean;
  hostControls: WatchPartyHostControls | null;
  /** Host's live watching session on this title — required for sync button. */
  hostPlaybackSnapshot?: HostPlaybackSnapshot | null;
};

export function WatchPartyHostControlsBar({
  partyId,
  partyOpen,
  isHost,
  hostControls,
  hostPlaybackSnapshot,
}: WatchPartyHostControlsBarProps) {
  const syncMutation = useWatchPartyHostControlsSync(partyId);

  const handleSync = async () => {
    if (!hostPlaybackSnapshot) {
      toast.error("Start watching this title to sync the party to your position.");
      return;
    }
    try {
      await syncMutation.mutateAsync({
        progressPercent: hostPlaybackSnapshot.progressPercent,
        elapsedMinutes: hostPlaybackSnapshot.elapsedMinutes,
        runtimeMinutes: hostPlaybackSnapshot.runtimeMinutes,
        paused: false,
      });
      toast.success("Party synced to your position.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not sync");
    }
  };

  const handleTogglePause = async () => {
    if (!hostControls) return;
    try {
      await syncMutation.mutateAsync({
        progressPercent: hostControls.progressPercent,
        elapsedMinutes: hostControls.elapsedMinutes,
        runtimeMinutes: hostControls.runtimeMinutes,
        paused: !hostControls.paused,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  };

  if (!partyOpen && !hostControls) return null;

  if (isHost) {
    const snapshot =
      hostPlaybackSnapshot ??
      (hostControls
        ? {
            progressPercent: hostControls.progressPercent,
            elapsedMinutes: hostControls.elapsedMinutes,
            runtimeMinutes: hostControls.runtimeMinutes,
          }
        : null);

    return (
      <div className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Playback sync
        </p>
        {hostControls ? (
          <p className="mt-1 text-[12px] text-muted-foreground">
            {formatHostSyncLabel(hostControls)}
            {isValid(new Date(hostControls.updatedAt))
              ? ` · ${formatDistanceToNow(new Date(hostControls.updatedAt), { addSuffix: true })}`
              : null}
          </p>
        ) : (
          <p className="mt-1 text-[12px] text-muted-foreground">
            Share where you are in the episode so guests can catch up on their stream.
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 cursor-pointer rounded-full px-3 text-xs"
            disabled={!partyOpen || syncMutation.isPending || !snapshot}
            onClick={() => void handleSync()}
          >
            {syncMutation.isPending
              ? "Syncing…"
              : snapshot
                ? `Sync party to here (~${snapshot.elapsedMinutes} min)`
                : "Sync party (start watching first)"}
          </Button>
          {hostControls ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 cursor-pointer rounded-full px-3 text-xs"
              disabled={!partyOpen || syncMutation.isPending}
              onClick={() => void handleTogglePause()}
            >
              {hostControls.paused ? "Resume sync" : "Mark paused"}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (!hostControls) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Host hasn&apos;t shared a playback position yet.
      </p>
    );
  }

  return (
    <p
      className={cn(
        "rounded-lg border px-3 py-2 text-[12px]",
        hostControls.paused
          ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100"
          : "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-100"
      )}
    >
      {formatHostSyncLabel(hostControls)}
      {isValid(new Date(hostControls.updatedAt))
        ? ` · updated ${formatDistanceToNow(new Date(hostControls.updatedAt), { addSuffix: true })}`
        : null}
    </p>
  );
}

/** Build snapshot from dashboard session or feed card session fields. */
export function watchPartyHostPlaybackSnapshot(session: {
  progressPercent?: number | null;
  runtimeMinutes?: number | null;
  startedAt?: string | null;
  status?: string | null;
} | null | undefined): HostPlaybackSnapshot | null {
  if (!session?.startedAt && session?.progressPercent == null) return null;
  return buildPlaybackSnapshotFromSession(session);
}
