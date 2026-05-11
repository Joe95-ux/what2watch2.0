"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type WatchPartyChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
};

async function fetchWatchPartyChat(partyId: string): Promise<{ messages: WatchPartyChatMessage[] }> {
  const res = await fetch(`/api/watch-party/rooms/${encodeURIComponent(partyId)}/chat`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(typeof err.error === "string" ? err.error : "Failed to load chat");
  }
  const data = (await res.json()) as { messages?: WatchPartyChatMessage[] };
  return { messages: Array.isArray(data.messages) ? data.messages : [] };
}

export function useWatchPartyChat(partyId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["watch-party-chat", partyId],
    queryFn: () => fetchWatchPartyChat(partyId!),
    enabled: Boolean(partyId) && enabled,
    staleTime: 20_000,
  });
}

export function useWatchPartyChatSend(partyId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      if (!partyId) throw new Error("No party");
      const res = await fetch(`/api/watch-party/rooms/${encodeURIComponent(partyId)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof err.error === "string" ? err.error : "Send failed");
      }
      return res.json() as Promise<{ message: WatchPartyChatMessage }>;
    },
    onSuccess: () => {
      if (partyId) {
        queryClient.invalidateQueries({ queryKey: ["watch-party-chat", partyId] });
      }
    },
  });
}
