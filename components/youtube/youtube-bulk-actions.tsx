"use client";

import { useState } from "react";
import { Heart, Bookmark, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { YouTubeVideo } from "@/hooks/use-youtube-channel";

interface BulkActionsBarProps {
  selectedVideos: YouTubeVideo[];
  onClearSelection: () => void;
  onBulkActionComplete?: () => void;
}

export function BulkActionsBar({
  selectedVideos,
  onClearSelection,
  onBulkActionComplete,
}: BulkActionsBarProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkAction = async (action: string) => {
    if (selectedVideos.length === 0) return;

    setIsProcessing(true);
    try {
      const videoIds = selectedVideos.map((v) => v.id);
      const videos = selectedVideos.map((v) => ({
        videoId: v.id,
        title: v.title,
        thumbnail: v.thumbnail,
        channelId: v.channelId,
        channelTitle: v.channelTitle,
        duration: v.duration,
        videoUrl: v.videoUrl,
        description: v.description,
        publishedAt: v.publishedAt,
      }));

      const response = await fetch("/api/youtube/videos/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          videoIds,
          videos,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to perform bulk action");
      }

      toast.success(
        `${selectedVideos.length} video${selectedVideos.length > 1 ? "s" : ""} ${
          action === "addToFavorites"
            ? "added to favorites"
            : action === "removeFromFavorites"
            ? "removed from favorites"
            : action === "addToWatchlist"
            ? "added to watchlist"
            : "removed from watchlist"
        }`
      );

      onClearSelection();
      onBulkActionComplete?.();
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform bulk action");
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedVideos.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 bg-card border rounded-lg shadow-lg px-4 py-3">
        <Badge variant="secondary" className="mr-2">
          {selectedVideos.length} selected
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBulkAction("addToFavorites")}
          disabled={isProcessing}
        >
          <Heart className="h-4 w-4 mr-2" />
          Add to Favorites
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBulkAction("addToWatchlist")}
          disabled={isProcessing}
        >
          <Bookmark className="h-4 w-4 mr-2" />
          Add to Watchlist
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBulkAction("removeFromFavorites")}
          disabled={isProcessing}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Remove from Favorites
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          disabled={isProcessing}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

