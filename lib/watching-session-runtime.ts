/** Wall-clock fields used to derive active watch time (excludes time while paused). */
export type WatchingSessionClock = {
  status: string;
  startedAt: string | Date;
  updatedAt?: string | Date | null;
  runtimeMinutes?: number | null;
};

export function getActiveWatchMs(session: WatchingSessionClock, nowMs = Date.now()): number {
  const startedMs = new Date(session.startedAt).getTime();
  if (Number.isNaN(startedMs)) return 0;

  if (session.status === "STOPPED") {
    const pausedAtMs = session.updatedAt ? new Date(session.updatedAt).getTime() : nowMs;
    if (Number.isNaN(pausedAtMs)) return 0;
    return Math.max(0, pausedAtMs - startedMs);
  }

  return Math.max(0, nowMs - startedMs);
}

export function getActiveWatchMinutes(session: WatchingSessionClock, nowMs = Date.now()): number {
  return Math.max(1, Math.round(getActiveWatchMs(session, nowMs) / 60_000));
}

export function isRuntimeWatchComplete(
  session: WatchingSessionClock,
  nowMs = Date.now()
): boolean {
  const runtime = session.runtimeMinutes;
  if (!runtime || runtime <= 0) return false;
  if (session.status !== "WATCHING_NOW") return false;
  return getActiveWatchMs(session, nowMs) >= runtime * 60_000;
}

/** Re-base `startedAt` on resume so elapsed active time continues after a pause. */
export function startedAtForResume(
  startedAt: Date,
  pausedAt: Date,
  resumeAt: Date = new Date()
): Date {
  const priorActiveMs = Math.max(0, pausedAt.getTime() - startedAt.getTime());
  return new Date(resumeAt.getTime() - priorActiveMs);
}
