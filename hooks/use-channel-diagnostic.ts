import { useQuery } from "@tanstack/react-query";

export interface ChannelDiagnostic {
  id: string;
  channelId: string;
  avgViews: string;
  avgEngagement: number;
  uploadFrequency: number;
  bestFormat?: string;
  subscriberGrowthRate: number;
  viewGrowthRate: number;
  avgTitleLength?: number;
  percentWithBrackets?: number;
  percentWithNumbers?: number;
  percentWithQuestions?: number;
  percentWithFaces?: number;
  percentWithText?: number;
  analyzedAt: Date;
}

export interface TopVideo {
  videoId: string;
  title: string;
  viewCount: number;
  engagementRate: number;
  publishedAt: Date;
}

export interface ChannelInfo {
  title: string;
  thumbnail: string;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
}

interface DiagnosticResponse {
  diagnostic: ChannelDiagnostic;
  channel: ChannelInfo;
  topVideos: TopVideo[];
  totalVideosAnalyzed: number;
}

async function fetchChannelDiagnostic(channelId: string): Promise<DiagnosticResponse> {
  const response = await fetch(`/api/youtube/channels/${channelId}/diagnostic`);
  if (!response.ok) {
    throw new Error("Failed to fetch channel diagnostic");
  }
  return response.json();
}

export function useChannelDiagnostic(
  channelId: string | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["channel-diagnostic", channelId],
    queryFn: () => fetchChannelDiagnostic(channelId!),
    enabled: enabled && !!channelId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
