/** Convert party timeline minutes to stored seconds. */
export function minutesToTimestampSec(minutes: number): number {
  return Math.max(0, Math.round(minutes)) * 60;
}

export function clampTimestampSec(
  sec: number,
  maxRuntimeMinutes?: number | null
): number {
  if (!Number.isFinite(sec)) return 0;
  const rounded = Math.max(0, Math.round(sec));
  if (maxRuntimeMinutes != null && maxRuntimeMinutes > 0) {
    return Math.min(rounded, maxRuntimeMinutes * 60);
  }
  return Math.min(rounded, 24 * 60 * 60);
}

import type { WatchPartyHostControls } from "@/lib/watch-party/host-controls";

export type PartyChatAnchorInput = {
  /** Shared party timeline when the host has synced. */
  hostControls?: WatchPartyHostControls | null;
  /** Current user's watch position on this title. */
  selfPlaybackSnapshot?: { elapsedMinutes: number } | null;
  /** Host-only live session (sync button source). */
  hostPlaybackSnapshot?: { elapsedMinutes: number } | null;
};

/** Client anchor for outgoing messages (host sync timeline, then local playback). */
export function getPartyChatAnchorTimestampSec(input: PartyChatAnchorInput): number | null {
  const minutes =
    input.hostControls?.elapsedMinutes ??
    input.selfPlaybackSnapshot?.elapsedMinutes ??
    input.hostPlaybackSnapshot?.elapsedMinutes ??
    null;
  if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return null;
  return minutesToTimestampSec(minutes);
}

/** Human label for chat timeline, e.g. "at 42m". */
export function formatPartyTimestampLabel(timestampSec: number | null | undefined): string | null {
  if (timestampSec == null || !Number.isFinite(timestampSec) || timestampSec < 0) {
    return null;
  }
  const minutes = Math.max(0, Math.round(timestampSec / 60));
  if (minutes <= 0) return "at start";
  return `at ${minutes}m`;
}

export type MessageTimestampContext = {
  clientTimestampSec?: number | null;
  hostSyncElapsedMinutes?: number | null;
  hostSyncRuntimeMinutes?: number | null;
  senderElapsedMinutes?: number | null;
  senderRuntimeMinutes?: number | null;
};

/** Resolve anchor second for a new party message (client hint → host sync → sender watch). */
export function resolveMessageTimestampSec(ctx: MessageTimestampContext): number | null {
  const maxRuntime =
    ctx.hostSyncRuntimeMinutes != null && ctx.hostSyncRuntimeMinutes > 0
      ? ctx.hostSyncRuntimeMinutes
      : ctx.senderRuntimeMinutes != null && ctx.senderRuntimeMinutes > 0
        ? ctx.senderRuntimeMinutes
        : null;

  if (typeof ctx.clientTimestampSec === "number" && Number.isFinite(ctx.clientTimestampSec)) {
    return clampTimestampSec(ctx.clientTimestampSec, maxRuntime);
  }

  if (typeof ctx.hostSyncElapsedMinutes === "number" && ctx.hostSyncElapsedMinutes >= 0) {
    return clampTimestampSec(minutesToTimestampSec(ctx.hostSyncElapsedMinutes), maxRuntime);
  }

  if (typeof ctx.senderElapsedMinutes === "number" && ctx.senderElapsedMinutes >= 0) {
    return clampTimestampSec(minutesToTimestampSec(ctx.senderElapsedMinutes), maxRuntime);
  }

  return null;
}
