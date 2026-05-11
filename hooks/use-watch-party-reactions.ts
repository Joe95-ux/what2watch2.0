"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WatchPartyReactionKind } from "@/lib/watch-party-reaction-kinds";

export type WatchPartyReactionsPayload = {
  counts: Record<WatchPartyReactionKind, number>;
  mine: WatchPartyReactionKind[];
};

async function fetchWatchPartyReactions(partyId: string): Promise<WatchPartyReactionsPayload> {
  const res = await fetch(`/api/watch-party/rooms/${encodeURIComponent(partyId)}/reactions`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(typeof err.error === "string" ? err.error : "Failed to load reactions");
  }
  return res.json() as Promise<WatchPartyReactionsPayload>;
}

export function useWatchPartyReactions(partyId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["watch-party-reactions", partyId],
    queryFn: () => fetchWatchPartyReactions(partyId!),
    enabled: Boolean(partyId) && enabled,
    staleTime: 20_000,
  });
}

export function useWatchPartyReactionToggle(partyId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (kind: WatchPartyReactionKind) => {
      if (!partyId) throw new Error("No party");
      const res = await fetch(`/api/watch-party/rooms/${encodeURIComponent(partyId)}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof err.error === "string" ? err.error : "Toggle failed");
      }
      return res.json() as Promise<WatchPartyReactionsPayload>;
    },
    onSuccess: (data) => {
      if (partyId) {
        queryClient.setQueryData<WatchPartyReactionsPayload>(["watch-party-reactions", partyId], data);
      }
    },
  });
}
