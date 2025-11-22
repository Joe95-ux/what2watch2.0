"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, Plus, Share2, Link2, Facebook, Twitter, Heart, Bookmark, MoreVertical, Trash2 } from "lucide-react";
import { YouTubeVideo } from "@/hooks/use-youtube-channel";
import { CircleActionButton } from "@/components/browse/circle-action-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import AddYouTubeVideoToPlaylistDropdown from "@/components/playlists/add-youtube-video-to-playlist-dropdown";
import { useToggleFavoriteChannel } from "@/hooks/use-favorite-channels";
import { useToggleChannelWatchlist } from "@/hooks/use-channel-watchlist";

interface YouTubeVideoCardProps {
  video: YouTubeVideo;
  className?: string;
  onVideoClick?: (video: YouTubeVideo) => void;
  onAddToPlaylist?: () => void;
  channelId?: string; // Channel ID for favorite/watchlist actions
  onRemove?: () => void; // Callback to remove video from playlist
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
  channelId,
  onRemove,
}: YouTubeVideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile();
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const [playlistTooltipOpen, setPlaylistTooltipOpen] = useState(false);
  const [isPlaylistDropdownOpen, setIsPlaylistDropdownOpen] = useState(false);
  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const toggleFavorite = useToggleFavoriteChannel();
  const toggleWatchlist = useToggleChannelWatchlist();

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
      !target.closest('[data-radix-tooltip-content]') &&
      !target.closest('[data-radix-dropdown-menu-trigger]') &&
      !target.closest('[data-radix-dropdown-menu-content]')
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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(video.videoUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setIsShareDropdownOpen(false);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
      console.error(error);
    }
  };

  const handleSocialShare = (platform: "facebook" | "twitter") => {
    const encodedUrl = encodeURIComponent(video.videoUrl);
    const encodedTitle = encodeURIComponent(video.title);

    let shareUrl = "";
    if (platform === "facebook") {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    } else if (platform === "twitter") {
      shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
      setIsShareDropdownOpen(false);
    }
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

        {/* Share Button - Top Right */}
        <div className="absolute top-2 right-2 z-[10] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <DropdownMenu open={isShareDropdownOpen} onOpenChange={setIsShareDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <CircleActionButton
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="bg-black/60 hover:bg-black/80 backdrop-blur-sm"
              >
                <Share2 className="h-3 w-3 text-white" />
              </CircleActionButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 z-[110]"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCopyLink();
                }}
                className="cursor-pointer"
              >
                {copied ? (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSocialShare("facebook");
                }}
                className="cursor-pointer"
              >
                <Facebook className="h-4 w-4 mr-2" />
                Share on Facebook
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSocialShare("twitter");
                }}
                className="cursor-pointer"
              >
                <Twitter className="h-4 w-4 mr-2" />
                Share on X
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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

        {/* Actions Dropdown Menu - Top Left (only if channelId provided or onRemove exists) */}
        {(channelId || onRemove) && (
          <div className="absolute top-2 left-2 z-[10] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <DropdownMenu open={isActionsDropdownOpen} onOpenChange={setIsActionsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <CircleActionButton
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="bg-black/60 hover:bg-black/80 backdrop-blur-sm"
                >
                  <MoreVertical className="h-3 w-3 text-white" />
                </CircleActionButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-48 z-[110]"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
              >
                {channelId && (
                  <>
                    <DropdownMenuItem
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await requireAuth(
                          () => toggleFavorite.toggle(channelId),
                          "Sign in to favorite channels."
                        );
                        setIsActionsDropdownOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <Heart
                        className={cn(
                          "h-4 w-4 mr-2",
                          toggleFavorite.isFavorited(channelId)
                            ? "text-red-500 fill-red-500"
                            : "text-muted-foreground"
                        )}
                      />
                      {toggleFavorite.isFavorited(channelId) ? "Remove from Favorites" : "Add to Favorites"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await requireAuth(
                          () => toggleWatchlist.toggle(channelId),
                          "Sign in to manage watchlist."
                        );
                        setIsActionsDropdownOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <Bookmark
                        className={cn(
                          "h-4 w-4 mr-2",
                          toggleWatchlist.isInWatchlist(channelId)
                            ? "text-blue-500 fill-blue-500"
                            : "text-muted-foreground"
                        )}
                      />
                      {toggleWatchlist.isInWatchlist(channelId) ? "Remove from Watchlist" : "Add to Watchlist"}
                    </DropdownMenuItem>
                  </>
                )}
                {onRemove && (
                  <>
                    {channelId && <div className="my-1 border-t border-border" />}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove();
                        setIsActionsDropdownOpen(false);
                      }}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove from Playlist
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
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

