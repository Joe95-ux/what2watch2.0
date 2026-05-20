"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { WatchPartyHostControls } from "@/lib/watch-party/host-controls";
import type { WatchPartyRoomSummary } from "@/hooks/use-watch-party-room-summary";

export type HostControlsPatch = {
  progressPercent: number;
  elapsedMinutes: number;
  runtimeMinutes: number | null;
  paused?: boolean;
};

export function useWatchPartyHostControlsSync(partyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: HostControlsPatch) => {
      if (!partyId) throw new Error("No watch party");
      const res = await fetch(`/api/watch-party/rooms/${encodeURIComponent(partyId)}/host-controls`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressPercent: patch.progressPercent,
          elapsedMinutes: patch.elapsedMinutes,
          runtimeMinutes: patch.runtimeMinutes,
          paused: patch.paused ?? false,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof err.error === "string" ? err.error : "Could not sync playback");
      }
      const data = (await res.json()) as { hostControls?: WatchPartyHostControls | null };
      return data.hostControls ?? null;
    },
    onSuccess: (hostControls) => {
      if (!partyId || !hostControls) return;
      queryClient.setQueryData(
        ["watch-party-room", partyId],
        (prev: WatchPartyRoomSummary | undefined) =>
          prev ? { ...prev, hostControls } : prev
      );
    },
  });
}
