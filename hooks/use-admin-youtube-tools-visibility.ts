import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type YoutubeToolsVisibilityMode = "HIDDEN_FROM_ALL" | "AVAILABLE_TO_ALL" | "INVITE_ONLY";

export interface AdminYouTubeToolsVisibilityResult {
  mode: YoutubeToolsVisibilityMode;
  allowedEmails: string[];
}

async function fetchAdminYouTubeToolsVisibility(): Promise<AdminYouTubeToolsVisibilityResult> {
  const res = await fetch("/api/admin/youtube-tools-visibility");
  if (!res.ok) throw new Error("Failed to fetch YouTube tools visibility");
  const data = await res.json();
  return {
    mode: data.mode ?? "AVAILABLE_TO_ALL",
    allowedEmails: data.allowedEmails ?? [],
  };
}

async function updateAdminYouTubeToolsVisibility(payload: {
  mode?: YoutubeToolsVisibilityMode;
  allowedEmails?: string[];
}): Promise<AdminYouTubeToolsVisibilityResult> {
  const res = await fetch("/api/admin/youtube-tools-visibility", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to update");
  }
  return res.json();
}

export function useAdminYouTubeToolsVisibility() {
  return useQuery<AdminYouTubeToolsVisibilityResult>({
    queryKey: ["admin-youtube-tools-visibility"],
    queryFn: fetchAdminYouTubeToolsVisibility,
    staleTime: 1000 * 60,
  });
}

export function useUpdateAdminYouTubeToolsVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAdminYouTubeToolsVisibility,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-youtube-tools-visibility"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-tools-visibility"] });
    },
  });
}
