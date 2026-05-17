"use client";

import { useMemo } from "react";
import type { WatchingSessionDTO } from "@/lib/watching-types";

export function useWatchingPulseStats(sessions: WatchingSessionDTO[] | undefined, currentUserId: string | null | undefined) {
  const activeWatchingPeopleCount = useMemo(
    () =>
      new Set(
        (sessions ?? [])
          .filter((session) => session.status === "WATCHING_NOW")
          .map((session) => session.userId)
      ).size,
    [sessions]
  );

  const friendsOnlineCount = useMemo(() => {
    const unique = new Set(
      (sessions ?? [])
        .filter((session) => session.status === "WATCHING_NOW" && session.userId !== currentUserId)
        .map((session) => session.userId)
    );
    return unique.size;
  }, [sessions, currentUserId]);

  return { activeWatchingPeopleCount, friendsOnlineCount };
}
