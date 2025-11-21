"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, Plus } from "lucide-react";
import { YouTubeVideo } from "@/hooks/use-youtube-channel";
import { CircleActionButton } from "@/components/browse/circle-action-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import AddYouTubeVideoToPlaylistDropdown from "@/components/playlists/add-youtube-video-to-playlist-dropdown";

interface YouTubeVideoCardProps {
  video: YouTubeVideo;
  className?: string;
  onVideoClick?: (video: YouTubeVideo) => void;
  onAddToPlaylist?: () => void;
}

/**
 * Parse ISO 8601 duration to readable format
 */
function parseDuration(duration?: string): string | null {
  if (!duration) return null;
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Format published date to relative time
 */
function formatPublishedDate(publishedAt: string): string {
  const date = new Date(publishedAt);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
}

export default function YouTubeVideoCard({
  video,
  className,
  onVideoClick,
  onAddToPlaylist,
}: YouTubeVideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile();
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const [playlistTooltipOpen, setPlaylistTooltipOpen] = useState(false);
  const [isPlaylistDropdownOpen, setIsPlaylistDropdownOpen] = useState(false);

  const duration = parseDuration(video.duration);
  const publishedTime = formatPublishedDate(video.publishedAt);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      !target.closest('button') && 
      !target.closest('[role="button"]') && 
      !target.closest('[data-radix-dropdown-trigger]') &&
      !target.closest('[data-radix-dropdown-content]') &&
      !target.closest('[data-radix-tooltip-trigger]') &&
      !target.closest('[data-radix-tooltip-content]')
    ) {
      if (onVideoClick) {
        onVideoClick(video);
      } else {
        window.open(video.videoUrl, "_blank", "noopener,noreferrer");
      }
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onVideoClick) {
      onVideoClick(video);
    } else {
      window.open(video.videoUrl, "_blank", "noopener,noreferrer");
    }
  };

  const requireAuth = async (action: () => Promise<void> | void, message?: string) => {
    if (!isSignedIn) {
      toast.error(message ?? "Please sign in to perform this action.");
      if (openSignIn) {
        openSignIn({
          afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
        });
      }
      return;
    }
    return action();
  };

  return (
    <div
      className={cn("relative bg-card rounded-lg overflow-hidden cursor-pointer group", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Video Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {video.thumbnail ? (
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            className={`object-cover transition-transform duration-500 ease-out ${
              isHovered ? "scale-110" : "scale-100"
            }`}
            sizes="(max-width: 640px) 200px, 300px"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
            <span className="text-muted-foreground text-sm">No Thumbnail</span>
          </div>
        )}

        {/* Duration - Bottom Right */}
        {duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-medium z-[5]">
            {duration}
          </div>
        )}

        {/* Centered Play Button - Revealed on hover */}
        <div
          className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
            isHovered || isMobile ? "opacity-100" : "opacity-0"
          }`}
        >
          {!isMobile && <div className="bg-black/40 backdrop-blur-sm absolute inset-0" />}
          <CircleActionButton
            size="lg"
            onClick={handlePlayClick}
            className="pointer-events-auto z-[5]"
          >
            <Play className="size-6 text-white fill-white" />
          </CircleActionButton>
        </div>
      </div>

      {/* Video Details */}
      <div className="bg-card p-3 space-y-2">
        {/* Top Row: Published Time + Add Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{publishedTime}</span>
          </div>
          <Tooltip
            open={playlistTooltipOpen && !isPlaylistDropdownOpen}
            onOpenChange={(open) => setPlaylistTooltipOpen(open)}
          >
            <TooltipTrigger asChild>
              {isSignedIn ? (
                <div>
                  <AddYouTubeVideoToPlaylistDropdown
                    video={video}
                    onAddSuccess={onAddToPlaylist}
                    onOpenChange={(open) => {
                      setIsPlaylistDropdownOpen(open);
                      if (open) {
                        setPlaylistTooltipOpen(false);
                      }
                    }}
                    trigger={
                      <CircleActionButton
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <Plus className="h-3 w-3 text-black dark:text-white" />
                      </CircleActionButton>
                    }
                  />
                </div>
              ) : (
                <CircleActionButton
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void requireAuth(async () => undefined, "Sign in to manage playlists.");
                  }}
                >
                  <Plus className="h-3 w-3 text-black dark:text-white" />
                </CircleActionButton>
              )}
            </TooltipTrigger>
            <TooltipContent>
              <p>Add to Playlist</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-foreground line-clamp-2">
          {video.title}
        </h3>

        {/* Channel Name */}
        <p className="text-xs text-muted-foreground line-clamp-1">
          {video.channelTitle}
        </p>
      </div>
    </div>
  );
}

