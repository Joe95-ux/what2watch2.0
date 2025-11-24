"use client";

import { useState } from "react";
import YouTubeVideoCard from "@/components/youtube/youtube-video-card";
import { BulkActionsBar } from "@/components/youtube/youtube-bulk-actions";
import { YouTubeVideo } from "@/hooks/use-youtube-channel";
import { Button } from "@/components/ui/button";
import { CheckSquare, Square } from "lucide-react";

interface YouTubeVideosWithBulkSelectProps {
  videos: YouTubeVideo[];
  channelIds?: string[];
  enableBulkSelect?: boolean;
}

export function YouTubeVideosWithBulkSelect({
  videos,
  channelIds = [],
  enableBulkSelect = true,
}: YouTubeVideosWithBulkSelectProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());

  const handleSelect = (video: YouTubeVideo, selected: boolean) => {
    const newSelected = new Set(selectedVideos);
    if (selected) {
      newSelected.add(video.id);
    } else {
      newSelected.delete(video.id);
    }
    setSelectedVideos(newSelected);
  };

  const handleClearSelection = () => {
    setSelectedVideos(new Set());
    setIsSelectionMode(false);
  };

  const handleSelectAll = () => {
    if (selectedVideos.size === videos.length) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(videos.map((v) => v.id)));
    }
  };

  const selectedVideosArray = videos.filter((v) => selectedVideos.has(v.id));

  return (
    <>
      {enableBulkSelect && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isSelectionMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedVideos.size === videos.length ? (
                    <CheckSquare className="h-4 w-4 mr-2" />
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  {selectedVideos.size === videos.length ? "Deselect All" : "Select All"}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedVideos.size} selected
                </span>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSelectionMode(true)}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Select Videos
              </Button>
            )}
          </div>
          {isSelectionMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
            >
              Cancel
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video, index) => (
          <YouTubeVideoCard
            key={video.id}
            video={video}
            channelId={channelIds[index]}
            selectable={isSelectionMode}
            selected={selectedVideos.has(video.id)}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {isSelectionMode && selectedVideosArray.length > 0 && (
        <BulkActionsBar
          selectedVideos={selectedVideosArray}
          onClearSelection={handleClearSelection}
          onBulkActionComplete={() => {
            // Optionally refresh data after bulk action
          }}
        />
      )}
    </>
  );
}

