import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface AnalyticsResponse {
  period: number;
  stats: {
    totalViews: number;
    completedViews: number;
    completionRate: number;
    totalWatchTime: number;
    averageWatchTime: number;
    engagement: {
      liked: number;
      addedToWatchlist: number;
      addedToPlaylist: number;
    };
  };
  topVideos: Array<{
    videoId: string;
    viewCount: number;
  }>;
  topChannels: Array<{
    channelId: string;
    viewCount: number;
  }>;
  viewsOverTime: Array<{
    createdAt: Date;
    _count: { id: number };
  }>;
  message?: string;
}

async function fetchAnalytics(period = 30, channelId?: string): Promise<AnalyticsResponse> {
  const params = new URLSearchParams({
    period: period.toString(),
  });
  if (channelId) {
    params.set("channelId", channelId);
  }

  const response = await fetch(`/api/youtube/videos/analytics?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch analytics");
  }
  return response.json();
}

export function useYouTubeAnalytics(period = 30, channelId?: string) {
  return useQuery({
    queryKey: ["youtube-analytics", period, channelId],
    queryFn: () => fetchAnalytics(period, channelId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

interface TrackVideoViewInput {
  videoId: string;
  channelId: string;
  viewDuration?: number;
  completed?: boolean;
  source?: string;
  liked?: boolean;
  addedToWatchlist?: boolean;
  addedToPlaylist?: boolean;
}

async function trackVideoView(input: TrackVideoViewInput) {
  const response = await fetch(`/api/youtube/videos/${input.videoId}/view`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to track video view");
  }

  return response.json();
}

export function useTrackYouTubeVideoView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: trackVideoView,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["youtube-analytics"] });
    },
  });
}

