import { useQuery } from "@tanstack/react-query";

export function useYouTubeCardStyle() {
  return useQuery({
    queryKey: ["youtube-card-style"],
    queryFn: async () => {
      const response = await fetch("/api/user/view-settings");
      if (!response.ok) {
        // Default to "centered" if not authenticated or error
        return "centered";
      }
      const data = await response.json();
      return (data.settings?.youtubeCardStyle || "centered") as "centered" | "horizontal";
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
