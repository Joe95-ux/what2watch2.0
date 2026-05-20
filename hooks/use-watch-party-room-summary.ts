"use client";

import { useQuery } from "@tanstack/react-query";
import type { WatchPartyHostControls } from "@/lib/watch-party/host-controls";

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
  hostControls: WatchPartyHostControls | null;
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
    hostControls: parseHostControls(raw.hostControls),
  };
}

function parseHostControls(raw: unknown): WatchPartyHostControls | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.updatedAt !== "string" || !o.updatedAt) return null;
  const progressPercent = typeof o.progressPercent === "number" ? o.progressPercent : null;
  const elapsedMinutes = typeof o.elapsedMinutes === "number" ? o.elapsedMinutes : null;
  if (progressPercent == null || elapsedMinutes == null) return null;
  return {
    progressPercent: Math.max(0, Math.min(100, Math.round(progressPercent))),
    elapsedMinutes: Math.max(1, Math.round(elapsedMinutes)),
    runtimeMinutes:
      typeof o.runtimeMinutes === "number" && o.runtimeMinutes > 0
        ? Math.round(o.runtimeMinutes)
        : null,
    paused: Boolean(o.paused),
    updatedAt: o.updatedAt,
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
