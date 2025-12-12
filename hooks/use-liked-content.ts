import { useQuery } from "@tanstack/react-query";

interface LikedContentItem {
  tmdbId: number;
  mediaType: "movie" | "tv";
  createdAt: string;
}

interface LikedContentResponse {
  likedContent: LikedContentItem[];
}

// Fetch user's liked content
export function useLikedContent() {
  return useQuery<LikedContentItem[]>({
    queryKey: ["liked-content"],
    queryFn: async () => {
      const response = await fetch("/api/content/liked");
      if (!response.ok) {
        throw new Error("Failed to fetch liked content");
      }
      const data: LikedContentResponse = await response.json();
      return data.likedContent || [];
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

