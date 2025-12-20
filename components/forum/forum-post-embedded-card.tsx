"use client";

import { useQuery } from "@tanstack/react-query";
import { parseResourceUrl } from "@/lib/forum-url-parser";
import PlaylistCard from "@/components/browse/playlist-card";
import ListCard from "@/components/browse/list-card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ForumPostEmbeddedCardProps {
  urlOrId: string;
  type?: "playlist" | "list" | "auto";
  className?: string;
}

export function ForumPostEmbeddedCard({ 
  urlOrId, 
  type = "auto",
  className 
}: ForumPostEmbeddedCardProps) {
  // Parse the URL to determine type and ID
  const parsed = type === "auto" 
    ? parseResourceUrl(urlOrId)
    : type === "playlist"
    ? { type: "playlist" as const, id: urlOrId }
    : { type: "list" as const, id: urlOrId };

  // Fetch playlist
  const { data: playlistData, isLoading: isLoadingPlaylist, error: playlistError } = useQuery({
    queryKey: ["playlist", parsed?.id],
    queryFn: async () => {
      if (!parsed || parsed.type !== "playlist") return null;
      const response = await fetch(`/api/playlists/${parsed.id}?public=true`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch playlist");
      }
      return response.json();
    },
    enabled: !!parsed && parsed.type === "playlist",
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch list
  const { data: listData, isLoading: isLoadingList, error: listError } = useQuery({
    queryKey: ["list", parsed?.id],
    queryFn: async () => {
      if (!parsed || parsed.type !== "list") return null;
      const response = await fetch(`/api/lists/${parsed.id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch list");
      }
      return response.json();
    },
    enabled: !!parsed && parsed.type === "list",
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Loading state
  if ((isLoadingPlaylist || isLoadingList) && parsed) {
    return (
      <div className={cn("max-w-md w-full", className)}>
        <Skeleton className="h-[225px] w-full rounded-lg" />
      </div>
    );
  }

  // Error state
  if (playlistError || listError) {
    const error = playlistError || listError;
    return (
      <div className={cn("max-w-md w-full", className)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to load resource"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Render playlist card
  if (playlistData?.playlist) {
    return (
      <div className={cn("max-w-md w-full", className)}>
        <PlaylistCard 
          playlist={playlistData.playlist} 
          variant="grid"
          className="w-full"
        />
      </div>
    );
  }

  // Render list card
  if (listData?.list) {
    return (
      <div className={cn("max-w-md w-full", className)}>
        <ListCard 
          list={listData.list} 
          variant="grid"
          className="w-full"
        />
      </div>
    );
  }

  // No resource found
  return null;
}

