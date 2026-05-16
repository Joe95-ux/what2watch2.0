"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  fetchWatchPartyRoomSummary,
  parseWatchPartyRoomSummary,
  type WatchPartyRoomSummary,
} from "@/hooks/use-watch-party-room-summary";

export class WatchPartyJoinError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "WatchPartyJoinError";
  }
}

const joinFlightByPartyId = new Map<string, Promise<WatchPartyRoomSummary>>();

/**
 * POST /join then use the summary returned by the server (same request, no stale read).
 */
export async function ensureWatchPartyMembership(
  queryClient: QueryClient,
  partyId: string
): Promise<WatchPartyRoomSummary> {
  const existing = joinFlightByPartyId.get(partyId);
  if (existing) return existing;

  const flight = (async () => {
    await queryClient.cancelQueries({ queryKey: ["watch-party-room", partyId] });

    const joinRes = await fetch(`/api/watch-party/rooms/${encodeURIComponent(partyId)}/join`, {
      method: "POST",
    });

    if (joinRes.status === 401) {
      throw new WatchPartyJoinError("Sign in to join this watch party.", 401);
    }
    if (joinRes.status === 410) {
      throw new WatchPartyJoinError("This watch party has ended.", 410);
    }
    if (!joinRes.ok) {
      const err = (await joinRes.json().catch(() => ({}))) as { error?: string };
      throw new WatchPartyJoinError(
        typeof err.error === "string" ? err.error : "Could not join watch party.",
        joinRes.status
      );
    }

    const body = (await joinRes.json()) as { summary?: Partial<WatchPartyRoomSummary> & { id: string } };
    const summary = body.summary
      ? parseWatchPartyRoomSummary(body.summary)
      : await fetchWatchPartyRoomSummary(partyId);

    queryClient.setQueryData(["watch-party-room", partyId], summary);
    return summary;
  })().finally(() => {
    joinFlightByPartyId.delete(partyId);
  });

  joinFlightByPartyId.set(partyId, flight);
  return flight;
}

type WatchPartyMembershipCallbacks = {
  onJoined?: (summary: WatchPartyRoomSummary) => void;
  onError?: (error: WatchPartyJoinError | Error) => void;
};

/**
 * When `?party=` is in the URL, auto-join and refresh the summary cache.
 */
export function useWatchPartyMembership(
  partyId: string | null,
  userId: string | undefined,
  queryClient: QueryClient,
  callbacks?: WatchPartyMembershipCallbacks,
  options?: { authReady?: boolean }
) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const authReady = options?.authReady ?? true;
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!partyId || !authReady || !userId) {
      setIsJoining(false);
      return;
    }

    let cancelled = false;
    setIsJoining(true);

    void ensureWatchPartyMembership(queryClient, partyId)
      .then((summary) => {
        if (cancelled) return;
        callbacksRef.current?.onJoined?.(summary);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const err = error instanceof Error ? error : new Error("Could not join watch party.");
        callbacksRef.current?.onError?.(err);
      })
      .finally(() => {
        if (!cancelled) setIsJoining(false);
      });

    return () => {
      cancelled = true;
    };
  }, [partyId, userId, queryClient, authReady]);

  return { isJoining };
}
