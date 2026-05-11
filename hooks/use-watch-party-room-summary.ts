"use client";

import { useQuery } from "@tanstack/react-query";

export type WatchPartyRoomParticipant = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

export type WatchPartyRoomSummary = {
  id: string;
  title: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  feedRoomKey: string;
  participantCount: number;
  isHost: boolean;
  isParticipant: boolean;
  participants: WatchPartyRoomParticipant[];
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

/** Cached GET for the party in the URL (`?party=`): menus, participant line, empty-feed banner. */
export function useWatchPartyRoomSummary(partyId: string | null) {
  return useQuery({
    queryKey: ["watch-party-room", partyId],
    queryFn: ({ queryKey }) => fetchWatchPartyRoomSummary(queryKey[1] as string),
    enabled: Boolean(partyId),
    staleTime: 60_000,
  });
}
