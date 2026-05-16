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

export function parseWatchPartyRoomSummary(
  raw: Partial<WatchPartyRoomSummary> & { id: string }
): WatchPartyRoomSummary {
  const mediaType = raw.mediaType === "tv" ? "tv" : "movie";
  return {
    id: raw.id,
    title: raw.title ?? "Watch party",
    tmdbId: typeof raw.tmdbId === "number" ? raw.tmdbId : 0,
    mediaType,
    feedRoomKey: raw.feedRoomKey ?? "",
    participantCount: typeof raw.participantCount === "number" ? raw.participantCount : 0,
    isHost: Boolean(raw.isHost),
    isParticipant: Boolean(raw.isParticipant),
    participants: Array.isArray(raw.participants) ? raw.participants : [],
    status: String(raw.status ?? "OPEN").toUpperCase() === "ENDED" ? "ENDED" : "OPEN",
  };
}

export async function fetchWatchPartyRoomSummary(partyId: string): Promise<WatchPartyRoomSummary> {
  const res = await fetch(`/api/watch-party/rooms/${encodeURIComponent(partyId)}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(typeof err.error === "string" ? err.error : "Failed to load watch party");
  }
  const raw = (await res.json()) as Partial<WatchPartyRoomSummary> & { id: string };
  return parseWatchPartyRoomSummary(raw);
}

/** Cached GET for the party in the URL (`?party=`): menus, participant line, empty-feed banner. */
export function useWatchPartyRoomSummary(
  partyId: string | null,
  options?: { enabled?: boolean }
) {
  const queryEnabled = options?.enabled !== false;
  return useQuery({
    queryKey: ["watch-party-room", partyId],
    queryFn: ({ queryKey }) => fetchWatchPartyRoomSummary(queryKey[1] as string),
    enabled: Boolean(partyId) && queryEnabled,
    staleTime: 0,
  });
}
