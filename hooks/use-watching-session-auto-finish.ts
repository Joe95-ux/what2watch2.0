"use client";

import { useEffect, useRef } from "react";
import type { WatchingSessionDTO } from "@/lib/watching-types";
import { getActiveWatchMs, isRuntimeWatchComplete } from "@/lib/watching-session-runtime";
import { useWatchingMutation } from "@/hooks/use-watching";

type UseWatchingSessionAutoFinishOptions = {
  enabled?: boolean;
};

/**
 * Schedules a single client-side timer from session + runtime already in React Query cache.
 * No polling, no repeated GETs, and no DB work until one POST `finish` when runtime elapses.
 * Pusher + mutation invalidation refresh the UI afterward.
 */
export function useWatchingSessionAutoFinish(
  session: WatchingSessionDTO | null | undefined,
  options?: UseWatchingSessionAutoFinishOptions
) {
  const enabled = options?.enabled !== false;
  const watchingMutation = useWatchingMutation();
  const finishingRef = useRef<string | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    if (!enabled) return;

    const current = sessionRef.current;
    if (!current || current.status !== "WATCHING_NOW") {
      finishingRef.current = null;
      return;
    }
    if (!current.runtimeMinutes || current.runtimeMinutes <= 0) return;

    const runFinish = async (target: WatchingSessionDTO) => {
      if (finishingRef.current === target.id) return;
      finishingRef.current = target.id;
      try {
        await watchingMutation.mutateAsync({
          action: "finish",
          sessionId: target.id,
        });
      } catch {
        finishingRef.current = null;
      }
    };

    if (isRuntimeWatchComplete(current)) {
      void runFinish(current);
      return;
    }

    const runtimeMs = current.runtimeMinutes * 60_000;
    const remainingMs = Math.max(0, runtimeMs - getActiveWatchMs(current));
    if (remainingMs <= 0) {
      void runFinish(current);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const latest = sessionRef.current;
      if (!latest || latest.id !== current.id) return;
      if (isRuntimeWatchComplete(latest)) {
        void runFinish(latest);
      }
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    enabled,
    session?.id,
    session?.status,
    session?.startedAt,
    session?.updatedAt,
    session?.runtimeMinutes,
    watchingMutation,
  ]);
}
