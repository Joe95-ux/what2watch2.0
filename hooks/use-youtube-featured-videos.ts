import { useQuery } from "@tanstack/react-query";
import { YouTubeVideo } from "./use-youtube-channel";

interface FeaturedVideosResponse {
  videos: Array<{
    id: string;
    title: string;
    description: string;
    thumbnail?: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    videoUrl: string;
  }>;
}

async function fetchFeaturedVideos(): Promise<YouTubeVideo[]> {
  const response = await fetch("/api/youtube/videos/featured");
  if (!response.ok) {
    throw new Error("Failed to fetch featured videos");
  }
  const data: FeaturedVideosResponse = await response.json();
  
  // Convert to YouTubeVideo format
  return data.videos.map((video) => ({
    id: video.id,
    title: video.title,
    description: video.description,
    thumbnail: video.thumbnail,
    channelId: video.channelId,
    channelTitle: video.channelTitle,
    publishedAt: video.publishedAt,
    duration: undefined,
    videoUrl: video.videoUrl,
  }));
}

export function useYouTubeFeaturedVideos() {
  return useQuery({
    queryKey: ["youtube-featured-videos"],
    queryFn: fetchFeaturedVideos,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

