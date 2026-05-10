"use client";

import { useQuery } from "@tanstack/react-query";

export type WatchPartyRoomSummary = {
  id: string;
  title: string;
  feedRoomKey: string;
  participantCount: number;
  isHost: boolean;
  status: "OPEN" | "ENDED";
};

export async function fetchWatchPartyRoomSummary(partyId: string): Promise<WatchPartyRoomSummary> {
  const res = await fetch(`/api/watch-party/rooms/${encodeURIComponent(partyId)}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(typeof err.error === "string" ? err.error : "Failed to load watch party");
  }
  return res.json() as Promise<WatchPartyRoomSummary>;
}

/** Cached GET for the party in the URL (`?party=`); used for host-only UI (e.g. End party). */
export function useWatchPartyRoomSummary(partyId: string | null) {
  return useQuery({
    queryKey: ["watch-party-room", partyId],
    queryFn: ({ queryKey }) => fetchWatchPartyRoomSummary(queryKey[1] as string),
    enabled: Boolean(partyId),
    staleTime: 60_000,
  });
}
