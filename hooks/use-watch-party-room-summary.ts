"use client";

import { useQuery } from "@tanstack/react-query";

export type WatchPartyRoomParticipant = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role?: "HOST" | "GUEST";
};

export type WatchPartyRoomSummary = {
  id: string;
  title: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  posterPath: string | null;
  backdropPath: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
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
  const participants: WatchPartyRoomParticipant[] = Array.isArray(raw.participants)
    ? raw.participants.map((p) => ({
        userId: String(p.userId ?? ""),
        name: typeof p.name === "string" ? p.name : "Unknown",
        avatarUrl: typeof p.avatarUrl === "string" ? p.avatarUrl : null,
        role: p.role === "HOST" ? "HOST" : "GUEST",
      }))
    : [];
  const parsedCount =
    typeof raw.participantCount === "number" ? raw.participantCount : participants.length;
  return {
    id: raw.id,
    title: raw.title ?? "Watch party",
    tmdbId: typeof raw.tmdbId === "number" ? raw.tmdbId : 0,
    mediaType,
    posterPath: typeof raw.posterPath === "string" ? raw.posterPath : null,
    backdropPath: typeof raw.backdropPath === "string" ? raw.backdropPath : null,
    seasonNumber: typeof raw.seasonNumber === "number" ? raw.seasonNumber : null,
    episodeNumber: typeof raw.episodeNumber === "number" ? raw.episodeNumber : null,
    feedRoomKey: raw.feedRoomKey ?? "",
    participantCount: Math.max(parsedCount, participants.length),
    isHost: Boolean(raw.isHost),
    isParticipant: Boolean(raw.isParticipant),
    participants,
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
