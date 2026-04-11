"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

export const YOUTUBE_CARD_STYLE_STORAGE_KEY = "w2w:youtube-card-style";

export type YouTubeCardStyle = "centered" | "horizontal";

function readLocalCardStyle(): YouTubeCardStyle {
  if (typeof window === "undefined") return "centered";
  try {
    const v = localStorage.getItem(YOUTUBE_CARD_STYLE_STORAGE_KEY);
    if (v === "horizontal" || v === "centered") return v;
  } catch {
    /* private mode / quota */
  }
  return "centered";
}

function writeLocalCardStyle(style: YouTubeCardStyle) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(YOUTUBE_CARD_STYLE_STORAGE_KEY, style);
  } catch {
    /* ignore */
  }
}

async function fetchServerCardStyle(): Promise<YouTubeCardStyle> {
  const response = await fetch("/api/user/view-settings");
  if (!response.ok) {
    return "centered";
  }
  const data = await response.json();
  return (data.settings?.youtubeCardStyle || "centered") as YouTubeCardStyle;
}

export function useYouTubeCardStyle() {
  const { isSignedIn, isLoaded } = useUser();

  return useQuery({
    queryKey: ["youtube-card-style", isLoaded ? Boolean(isSignedIn) : "loading"],
    queryFn: async () => {
      if (!isLoaded) return "centered";
      if (!isSignedIn) {
        return readLocalCardStyle();
      }
      return fetchServerCardStyle();
    },
    enabled: isLoaded,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateYouTubeCardStyle() {
  const queryClient = useQueryClient();
  const { isSignedIn, isLoaded } = useUser();

  return useMutation({
    mutationFn: async (nextStyle: YouTubeCardStyle) => {
      if (!isLoaded) {
        throw new Error("Not ready");
      }
      if (!isSignedIn) {
        writeLocalCardStyle(nextStyle);
        return nextStyle;
      }
      const response = await fetch("/api/user/view-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeCardStyle: nextStyle }),
      });
      if (!response.ok) {
        throw new Error("Failed to update card style");
      }
      return nextStyle;
    },
    onMutate: async (nextStyle) => {
      await queryClient.cancelQueries({ queryKey: ["youtube-card-style"] });
      const previousEntries = queryClient.getQueriesData<YouTubeCardStyle>({
        queryKey: ["youtube-card-style"],
      });
      queryClient.setQueriesData({ queryKey: ["youtube-card-style"] }, nextStyle);
      return { previousEntries };
    },
    onError: (error, _nextStyle, context) => {
      if (context?.previousEntries?.length) {
        for (const [key, data] of context.previousEntries) {
          queryClient.setQueryData(key, data);
        }
      }
      if (error instanceof Error && error.message === "Not ready") {
        return;
      }
      toast.error("Failed to update card style");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["youtube-card-style"] });
    },
  });
}
