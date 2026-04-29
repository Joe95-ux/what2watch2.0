"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

export type RoomMatchScoreInput = {
  key: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  watchingCount: number;
  thoughtCount: number;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
};

export function useRoomMatchScores(rooms: RoomMatchScoreInput[]) {
  const roomPayload = useMemo(
    () =>
      rooms.map((room) => ({
        key: room.key,
        tmdbId: room.tmdbId,
        mediaType: room.mediaType,
        title: room.title,
        watchingCount: room.watchingCount,
        thoughtCount: room.thoughtCount,
        seasonNumber: room.seasonNumber ?? null,
        episodeNumber: room.episodeNumber ?? null,
      })),
    [rooms]
  );

  return useQuery({
    queryKey: ["watching-room-match-scores", roomPayload],
    queryFn: async () => {
      const response = await fetch("/api/watching/room-match-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rooms: roomPayload }),
      });
      if (!response.ok) throw new Error("Failed to fetch room match scores");
      return (await response.json()) as { scores: Record<string, number> };
    },
    enabled: roomPayload.length > 0,
    staleTime: 60_000,
  });
}
