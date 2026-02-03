import { useQuery } from "@tanstack/react-query";

export type YoutubeToolsVisibilityMode = "HIDDEN_FROM_ALL" | "AVAILABLE_TO_ALL" | "INVITE_ONLY";

export interface YouTubeToolsVisibilityResult {
  mode: YoutubeToolsVisibilityMode;
  hasAccess: boolean;
}

async function fetchYouTubeToolsVisibility(): Promise<YouTubeToolsVisibilityResult> {
  const res = await fetch("/api/youtube-tools-visibility");
  if (!res.ok) throw new Error("Failed to fetch YouTube tools visibility");
  const data = await res.json();
  return {
    mode: data.mode ?? "AVAILABLE_TO_ALL",
    hasAccess: data.hasAccess ?? false,
  };
}

/** Whether the nav should show the full YouTube tools dropdown (true) or a simple link to youtube.com (false). */
export function useYouTubeToolsVisibility() {
  return useQuery<YouTubeToolsVisibilityResult>({
    queryKey: ["youtube-tools-visibility"],
    queryFn: fetchYouTubeToolsVisibility,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/** True when we should show only a "YouTube" link to youtube.com; false when we show the tools dropdown. */
export function useShowSimpleYouTubeLink(): boolean {
  const { data } = useYouTubeToolsVisibility();
  if (!data) return false;
  if (data.mode === "HIDDEN_FROM_ALL") return true;
  if (data.mode === "INVITE_ONLY" && !data.hasAccess) return true;
  return false;
}
