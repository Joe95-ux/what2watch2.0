"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  aggregateReactionCounts,
  type WatchPartyReactionPulseDto,
} from "@/lib/watch-party/reaction-pulses";
import {
  isWatchPartyReactionKind,
  WATCH_PARTY_REACTION_KINDS,
  type WatchPartyReactionKind,
} from "@/lib/watch-party-reaction-kinds";

export type WatchPartyReactionsPayload = {
  counts: Record<WatchPartyReactionKind, number>;
  recentPulses: WatchPartyReactionPulseDto[];
};

export type WatchPartyReactionPulseInput = {
  kind: WatchPartyReactionKind;
  timestampSec?: number | null;
};

function parseReactionsPayload(data: Partial<WatchPartyReactionsPayload>): WatchPartyReactionsPayload {
  const recentPulses = Array.isArray(data.recentPulses)
    ? data.recentPulses.filter(
        (p): p is WatchPartyReactionPulseDto =>
          !!p &&
          typeof p.id === "string" &&
          isWatchPartyReactionKind(p.kind) &&
          typeof p.createdAt === "string"
      )
    : [];
  return {
    counts: aggregateReactionCounts(recentPulses),
    recentPulses,
  };
}

async function fetchWatchPartyReactions(partyId: string): Promise<WatchPartyReactionsPayload> {
  const res = await fetch(`/api/watch-party/rooms/${encodeURIComponent(partyId)}/reactions`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(typeof err.error === "string" ? err.error : "Failed to load reactions");
  }
  const data = (await res.json()) as Partial<WatchPartyReactionsPayload>;
  return parseReactionsPayload(data);
}

export function useWatchPartyReactions(partyId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["watch-party-reactions", partyId],
    queryFn: () => fetchWatchPartyReactions(partyId!),
    enabled: Boolean(partyId) && enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
}

export function useWatchPartyReactionPulse(partyId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: WatchPartyReactionPulseInput) => {
      if (!partyId) throw new Error("No party");
      const res = await fetch(`/api/watch-party/rooms/${encodeURIComponent(partyId)}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof err.error === "string" ? err.error : "Reaction failed");
      }
      const raw = (await res.json()) as Partial<WatchPartyReactionsPayload>;
      return parseReactionsPayload(raw);
    },
    onSuccess: (data) => {
      if (partyId) {
        queryClient.setQueryData<WatchPartyReactionsPayload>(["watch-party-reactions", partyId], data);
      }
    },
  });
}

/** @deprecated Use useWatchPartyReactionPulse — pulses are append-only, not toggles. */
export function useWatchPartyReactionToggle(partyId: string | null) {
  const pulse = useWatchPartyReactionPulse(partyId);
  return {
    ...pulse,
    mutateAsync: (kind: WatchPartyReactionKind) => pulse.mutateAsync({ kind }),
  };
}
