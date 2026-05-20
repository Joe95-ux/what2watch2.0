export type WatchPartyHostControls = {
  progressPercent: number;
  elapsedMinutes: number;
  runtimeMinutes: number | null;
  paused: boolean;
  updatedAt: string;
};

export type PlaybackSnapshotInput = {
  progressPercent?: number | null;
  runtimeMinutes?: number | null;
  startedAt?: string | null;
  status?: string | null;
};

export function clampProgressPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function clampElapsedMinutes(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.round(value));
}

/** Derive progress from an active watching session (feed card or dashboard session). */
export function buildPlaybackSnapshotFromSession(session: PlaybackSnapshotInput): {
  progressPercent: number;
  elapsedMinutes: number;
  runtimeMinutes: number | null;
} {
  const runtimeMinutes =
    typeof session.runtimeMinutes === "number" && session.runtimeMinutes > 0
      ? session.runtimeMinutes
      : null;

  const capForActive = (value: number) =>
    session.status === "WATCHING_NOW" ? Math.min(99, value) : Math.min(100, value);

  if (typeof session.progressPercent === "number") {
    const progressPercent = Math.max(0, capForActive(session.progressPercent));
    const elapsedMinutes =
      runtimeMinutes != null
        ? clampElapsedMinutes(Math.round((progressPercent / 100) * runtimeMinutes))
        : clampElapsedMinutes(
            session.startedAt
              ? Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000)
              : 1
          );
    return { progressPercent, elapsedMinutes, runtimeMinutes };
  }

  const elapsedMinutes = session.startedAt
    ? clampElapsedMinutes(Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000))
    : 1;
  const estimatedTotal = runtimeMinutes ?? 120;
  const progressPercent = Math.max(0, capForActive(Math.round((elapsedMinutes / estimatedTotal) * 100)));
  return { progressPercent, elapsedMinutes, runtimeMinutes };
}

export function hostControlsFromRoom(row: {
  hostSyncProgressPercent: number | null;
  hostSyncElapsedMinutes: number | null;
  hostSyncRuntimeMinutes: number | null;
  hostSyncPaused: boolean;
  hostSyncUpdatedAt: Date | null;
}): WatchPartyHostControls | null {
  if (
    row.hostSyncProgressPercent == null ||
    row.hostSyncElapsedMinutes == null ||
    !row.hostSyncUpdatedAt
  ) {
    return null;
  }
  return {
    progressPercent: clampProgressPercent(row.hostSyncProgressPercent),
    elapsedMinutes: clampElapsedMinutes(row.hostSyncElapsedMinutes),
    runtimeMinutes:
      typeof row.hostSyncRuntimeMinutes === "number" && row.hostSyncRuntimeMinutes > 0
        ? row.hostSyncRuntimeMinutes
        : null,
    paused: Boolean(row.hostSyncPaused),
    updatedAt: row.hostSyncUpdatedAt.toISOString(),
  };
}

export function formatHostSyncLabel(controls: WatchPartyHostControls): string {
  const runtime =
    controls.runtimeMinutes != null && controls.runtimeMinutes > 0
      ? ` · ~${controls.runtimeMinutes} min total`
      : "";
  const position = `~${controls.elapsedMinutes} min in (${controls.progressPercent}%)`;
  return controls.paused ? `Host paused · ${position}${runtime}` : `Host synced · ${position}${runtime}`;
}
