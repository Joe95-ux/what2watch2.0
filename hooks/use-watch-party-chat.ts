"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type WatchPartyChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  timestampSec: number | null;
  user: { id: string; name: string; avatarUrl: string | null };
};

export type WatchPartyChatSendInput = {
  content: string;
  timestampSec?: number | null;
};

async function fetchWatchPartyChat(partyId: string): Promise<{ messages: WatchPartyChatMessage[] }> {
  const res = await fetch(`/api/watch-party/rooms/${encodeURIComponent(partyId)}/chat`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(typeof err.error === "string" ? err.error : "Failed to load chat");
  }
  const data = (await res.json()) as { messages?: WatchPartyChatMessage[] };
  return {
    messages: Array.isArray(data.messages)
      ? data.messages.map((m) => ({
          ...m,
          timestampSec: typeof m.timestampSec === "number" ? m.timestampSec : null,
        }))
      : [],
  };
}

export function useWatchPartyChat(partyId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["watch-party-chat", partyId],
    queryFn: () => fetchWatchPartyChat(partyId!),
    enabled: Boolean(partyId) && enabled,
    staleTime: 20_000,
  });
}

export function useWatchPartyChatSend(
  partyId: string | null,
  options?: {
    currentUser?: { id: string; name: string; avatarUrl: string | null } | null;
  }
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: string | WatchPartyChatSendInput) => {
      if (!partyId) throw new Error("No party");
      const payload: WatchPartyChatSendInput =
        typeof input === "string" ? { content: input } : input;
      const res = await fetch(`/api/watch-party/rooms/${encodeURIComponent(partyId)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof err.error === "string" ? err.error : "Send failed");
      }
      return res.json() as Promise<{ message: WatchPartyChatMessage }>;
    },
    onMutate: async (input) => {
      if (!partyId) return {};
      const payload: WatchPartyChatSendInput =
        typeof input === "string" ? { content: input } : input;
      await queryClient.cancelQueries({ queryKey: ["watch-party-chat", partyId] });
      const previous = queryClient.getQueryData<{ messages: WatchPartyChatMessage[] }>([
        "watch-party-chat",
        partyId,
      ]);
      const user = options?.currentUser;
      if (previous && user) {
        const optimistic: WatchPartyChatMessage = {
          id: `temp-${Date.now()}`,
          content: payload.content.trim(),
          createdAt: new Date().toISOString(),
          timestampSec:
            typeof payload.timestampSec === "number" ? payload.timestampSec : null,
          user: {
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl,
          },
        };
        queryClient.setQueryData(["watch-party-chat", partyId], {
          messages: [...previous.messages, optimistic],
        });
      }
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (partyId && context?.previous) {
        queryClient.setQueryData(["watch-party-chat", partyId], context.previous);
      }
    },
    onSuccess: (data) => {
      if (!partyId) return;
      queryClient.setQueryData<{ messages: WatchPartyChatMessage[] }>(
        ["watch-party-chat", partyId],
        (prev) => {
          if (!prev) return { messages: [data.message] };
          const withoutTemp = prev.messages.filter((m) => !m.id.startsWith("temp-"));
          if (withoutTemp.some((m) => m.id === data.message.id)) {
            return { messages: withoutTemp };
          }
          return { messages: [...withoutTemp, data.message] };
        }
      );
      queryClient.invalidateQueries({ queryKey: ["watch-party-chat", partyId] });
    },
  });
}
