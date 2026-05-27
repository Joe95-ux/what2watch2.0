"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WatchPartyScheduleDto } from "@/lib/watch-party/map-schedule";

type SchedulesQuery = {
  hostUserId?: string | null;
  tmdbId?: number | null;
  mediaType?: "movie" | "tv" | null;
};

function buildSchedulesUrl(query: SchedulesQuery): string {
  const params = new URLSearchParams();
  if (query.hostUserId) params.set("hostUserId", query.hostUserId);
  if (query.tmdbId) params.set("tmdbId", String(query.tmdbId));
  if (query.mediaType) params.set("mediaType", query.mediaType);
  const q = params.toString();
  return `/api/watch-party/schedules${q ? `?${q}` : ""}`;
}

export function useWatchPartySchedules(query: SchedulesQuery, enabled: boolean) {
  return useQuery({
    queryKey: ["watch-party-schedules", query.hostUserId, query.tmdbId, query.mediaType],
    queryFn: async () => {
      const res = await fetch(buildSchedulesUrl(query));
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof err.error === "string" ? err.error : "Failed to load schedules");
      }
      const data = (await res.json()) as { schedules?: WatchPartyScheduleDto[] };
      return { schedules: Array.isArray(data.schedules) ? data.schedules : [] };
    },
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
}

export function useWatchPartyScheduleCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tmdbId: number;
      mediaType: "movie" | "tv";
      title: string;
      posterPath?: string | null;
      seasonNumber?: number | null;
      episodeNumber?: number | null;
      scheduledAt: string;
      recurrence?: "NONE" | "WEEKLY";
      note?: string | null;
    }) => {
      const res = await fetch("/api/watch-party/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof err.error === "string" ? err.error : "Could not save schedule");
      }
      return (await res.json()) as { schedule: WatchPartyScheduleDto };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-party-schedules"] });
    },
  });
}

export function useWatchPartyScheduleDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const res = await fetch(`/api/watch-party/schedules/${encodeURIComponent(scheduleId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof err.error === "string" ? err.error : "Could not delete schedule");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-party-schedules"] });
    },
  });
}
