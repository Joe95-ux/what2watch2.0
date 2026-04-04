"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ViewingLogActivityLikesData {
  likeCount: number;
  likedByMe: boolean;
  likedActivityId: string | null;
  primaryActivityId: string | null;
}

async function fetchActivityLikes(logId: string): Promise<ViewingLogActivityLikesData> {
  const res = await fetch(`/api/viewing-logs/${logId}/activity-likes`);
  if (!res.ok) throw new Error("Failed to load diary likes");
  return res.json();
}

export function useViewingLogActivityLikes(logId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["viewing-log-activity-likes", logId],
    queryFn: () => fetchActivityLikes(logId!),
    enabled: Boolean(logId),
  });

  const toggleLike = useMutation({
    mutationFn: async (data: ViewingLogActivityLikesData) => {
      if (data.likedByMe && data.likedActivityId) {
        const r = await fetch(`/api/activity/${data.likedActivityId}/like`, {
          method: "DELETE",
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || "Failed to unlike");
        }
        return;
      }
      if (!data.likedByMe && data.primaryActivityId) {
        const r = await fetch(`/api/activity/${data.primaryActivityId}/like`, {
          method: "POST",
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || "Failed to like");
        }
        return;
      }
      throw new Error("Diary entry is not linked to an activity yet.");
    },
    onSuccess: () => {
      if (logId) {
        queryClient.invalidateQueries({ queryKey: ["viewing-log-activity-likes", logId] });
      }
    },
  });

  return { ...query, toggleLike };
}
