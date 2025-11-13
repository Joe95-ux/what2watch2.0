import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ChatSession {
  id: string;
  sessionId: string;
  mode: "recommendation" | "information";
  title: string | null;
  messages: unknown; // Will be parsed as ChatMessage[]
  metadata: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export function useChatSessions(mode?: "recommendation" | "information") {
  return useQuery<{ sessions: ChatSession[] }>({
    queryKey: ["ai-chat-sessions", mode],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (mode) {
        params.set("mode", mode);
      }
      const response = await fetch(`/api/ai/chat/sessions?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch chat sessions");
      }
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useChatSession(sessionId: string | null) {
  return useQuery<{ session: ChatSession }>({
    queryKey: ["ai-chat-session", sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error("Session ID is required");
      const response = await fetch(`/api/ai/chat/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch chat session");
      }
      return response.json();
    },
    enabled: !!sessionId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useSaveChatSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      mode,
      messages,
      metadata,
      title,
    }: {
      sessionId: string;
      mode: "recommendation" | "information";
      messages: unknown[];
      metadata?: unknown;
      title?: string;
    }) => {
      const response = await fetch("/api/ai/chat/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          mode,
          messages,
          metadata,
          title,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to save chat session" }));
        throw new Error(error.error || "Failed to save chat session");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: ["ai-chat-sessions"] });
    },
  });
}

export function useDeleteChatSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/ai/chat/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to delete chat session" }));
        throw new Error(error.error || "Failed to delete chat session");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: ["ai-chat-sessions"] });
    },
  });
}

