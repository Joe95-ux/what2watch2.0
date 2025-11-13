import { useMutation } from "@tanstack/react-query";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  results?: (TMDBMovie | TMDBSeries)[];
  intent?: "RECOMMENDATION" | "INFORMATION";
  metadata?: {
    genres?: number[];
    year?: number;
    type?: "movie" | "tv" | "all";
    keywords?: string[];
  };
  timestamp: Date;
}

export interface ChatResponse {
  intent: "RECOMMENDATION" | "INFORMATION";
  message: string;
  results: (TMDBMovie | TMDBSeries)[];
  metadata?: {
    genres?: number[];
    year?: number;
    type?: "movie" | "tv" | "all";
    keywords?: string[];
  };
}

export function useAiChat(sessionId: string) {
  return useMutation({
    mutationFn: async ({
      message,
      conversationHistory,
      mode = "recommendation",
    }: {
      message: string;
      conversationHistory: ChatMessage[];
      mode?: "recommendation" | "information";
    }): Promise<ChatResponse> => {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          sessionId,
          conversationHistory: conversationHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          mode,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to process chat message" }));
        throw new Error(error.error || "Failed to process chat message");
      }

      return response.json();
    },
  });
}

