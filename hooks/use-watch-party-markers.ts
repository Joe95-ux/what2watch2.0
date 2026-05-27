"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WatchPartyMarkerDto } from "@/lib/watch-party/map-marker";

export type WatchPartyMarkersPayload = {
  markers: WatchPartyMarkerDto[];
};

async function fetchWatchPartyMarkers(partyId: string): Promise<WatchPartyMarkersPayload> {
  const res = await fetch(`/api/watch-party/rooms/${encodeURIComponent(partyId)}/markers`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(typeof err.error === "string" ? err.error : "Failed to load markers");
  }
  const data = (await res.json()) as { markers?: WatchPartyMarkerDto[] };
  return { markers: Array.isArray(data.markers) ? data.markers : [] };
}

export function useWatchPartyMarkers(partyId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["watch-party-markers", partyId],
    queryFn: () => fetchWatchPartyMarkers(partyId!),
    enabled: Boolean(partyId) && enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
}

export function useWatchPartyMarkerPin(partyId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { label?: string; timestampSec?: number | null }) => {
      if (!partyId) throw new Error("No party");
      const res = await fetch(`/api/watch-party/rooms/${encodeURIComponent(partyId)}/markers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof err.error === "string" ? err.error : "Could not pin moment");
      }
      return (await res.json()) as WatchPartyMarkersPayload;
    },
    onSuccess: (data) => {
      if (partyId) {
        queryClient.setQueryData(["watch-party-markers", partyId], data);
      }
    },
  });
}

export function useWatchPartyMarkerUnpin(partyId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (markerId: string) => {
      if (!partyId) throw new Error("No party");
      const res = await fetch(
        `/api/watch-party/rooms/${encodeURIComponent(partyId)}/markers/${encodeURIComponent(markerId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof err.error === "string" ? err.error : "Could not remove marker");
      }
      return (await res.json()) as WatchPartyMarkersPayload;
    },
    onSuccess: (data) => {
      if (partyId) {
        queryClient.setQueryData(["watch-party-markers", partyId], data);
      }
    },
  });
}
