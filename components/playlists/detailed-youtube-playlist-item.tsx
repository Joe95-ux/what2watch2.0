"use client";

import { useState, useEffect } from "react";
import { YouTubePlaylistItem } from "@/hooks/use-playlists";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, GripVertical, Play, ArrowUpDown, Trash2, Youtube } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChangeOrderModal } from "./change-order-modal";
import type { SortField } from "@/components/shared/collection-filters";
import { useUpdateYouTubePlaylistItemMutation } from "@/hooks/use-playlists";

interface DetailedYouTubePlaylistItemProps {
  youtubeItem: YouTubePlaylistItem;
  playlistId: string;
  isEditMode: boolean;
  isSelected: boolean;
  order?: number;
  index: number;
  totalItems: number;
  onSelect: () => void;
  onRemove?: () => void;
  onItemClick: () => void;
  isLgScreen: boolean;
  sortField: SortField;
  isPublic?: boolean;
  enableOrdering?: boolean; // If false, hide grip icons and order controls
}

/**
 * Parse ISO 8601 duration to readable format
 */
function parseDuration(duration?: string | null): string | null {
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

export function DetailedYouTubePlaylistItem({
  youtubeItem,
  playlistId,
  isEditMode,
  isSelected,
  order,
  index,
  totalItems,
  onSelect,
  onRemove,
  onItemClick,
  isLgScreen,
  sortField,
  isPublic,
  enableOrdering = true, // Default to true for backward compatibility
}: DetailedYouTubePlaylistItemProps) {
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const updateYouTubePlaylistItem = useUpdateYouTubePlaylistItemMutation(playlistId);
  // Note: YouTube playlist items don't have notes in the current schema
  // If needed in the future, we can add note support

  const formattedAddedDate = format(new Date(youtubeItem.createdAt), "MMM d, yyyy");
  const formattedPublishedDate = youtubeItem.publishedAt
    ? format(new Date(youtubeItem.publishedAt), "MMM d, yyyy")
    : null;
  const duration = parseDuration(youtubeItem.duration);

  const handleOrderChange = async (newOrder: number) => {
    await updateYouTubePlaylistItem.mutateAsync({
      itemId: youtubeItem.id,
      updates: { order: newOrder },
    });
    // Toast is shown by the modal, no need to show here
  };

  const handleVideoClick = () => {
    window.open(`https://www.youtube.com/watch?v=${youtubeItem.videoId}`, "_blank");
  };

  return (
    <>
      <div
        className={cn(
          "relative flex gap-4 p-4 rounded-lg border border-border bg-card transition-all group",
          isEditMode && isSelected && "bg-primary/10 border-primary",
          !isEditMode && "cursor-pointer hover:border-primary/50"
        )}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('button, a, input, select, textarea')) {
            return;
          }
          onItemClick();
        }}
      >
        {isEditMode && isLgScreen && (
          <div className="flex-shrink-0 flex items-center gap-2">
            {enableOrdering && sortField === "listOrder" && (
              <div className="text-muted-foreground">
                <GripVertical className="h-5 w-5" />
              </div>
            )}
            <Button
              variant={isSelected ? "default" : "outline"}
              size="icon"
              className={cn("h-6 w-6 cursor-pointer", isSelected && "bg-primary")}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              {isSelected ? (
                <Check className="h-3 w-3" />
              ) : (
                <div className="h-3 w-3 border-2 border-current rounded" />
              )}
            </Button>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 flex-1 min-w-0">
          <div className="flex flex-row gap-4 flex-1 min-w-0">
            {isEditMode && !isLgScreen && (
              <div className="flex-shrink-0 flex items-start pt-1">
                <Button
                  variant={isSelected ? "default" : "outline"}
                  size="icon"
                  className={cn(
                    "h-6 w-6 cursor-pointer",
                    isSelected && "bg-primary"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                  }}
                >
                  {isSelected ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <div className="h-3 w-3 border-2 border-current rounded" />
                  )}
                </Button>
              </div>
            )}
            {youtubeItem.thumbnail ? (
              <div className="relative w-20 h-28 sm:w-24 sm:h-36 rounded overflow-hidden flex-shrink-0 bg-muted">
                <Image
                  src={youtubeItem.thumbnail}
                  alt={youtubeItem.title}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
                {duration && (
                  <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                    {duration}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVideoClick();
                    }}
                  >
                    <Play className="h-6 w-6 ml-1" fill="currentColor" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-20 h-28 sm:w-24 sm:h-36 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                <Youtube className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {enableOrdering && order !== undefined && (
                  <span className="text-sm text-muted-foreground">
                    {order}.
                  </span>
                )}
                <h3 className="text-lg font-semibold group-hover:text-primary transition-colors truncate sm:truncate-none">
                  {youtubeItem.title}
                </h3>
                {isEditMode && (
                  <>
                    <Badge variant="secondary" className="text-xs">
                      Added {formattedAddedDate}
                    </Badge>
                    {enableOrdering && sortField === "listOrder" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOrderModalOpen(true);
                        }}
                      >
                        <ArrowUpDown className="h-3 w-3 mr-1" />
                        Change Order
                      </Button>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
                {youtubeItem.channelTitle && (
                  <>
                    <span className="font-medium">Channel:</span>
                    <span>{youtubeItem.channelTitle}</span>
                  </>
                )}
                {formattedPublishedDate && (
                  <>
                    {youtubeItem.channelTitle && <span>•</span>}
                    <span>Published {formattedPublishedDate}</span>
                  </>
                )}
                {duration && (
                  <>
                    {(youtubeItem.channelTitle || formattedPublishedDate) && <span>•</span>}
                    <span>{duration}</span>
                  </>
                )}
              </div>

              <div className="hidden sm:block">
                {youtubeItem.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {youtubeItem.description}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVideoClick();
                  }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Watch on YouTube
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:hidden gap-2">
            {youtubeItem.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {youtubeItem.description}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-fit cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleVideoClick();
              }}
            >
              <Play className="h-4 w-4 mr-2" />
              Watch on YouTube
            </Button>
          </div>
        </div>
        {!isEditMode && onRemove && (
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                if (onRemove) onRemove();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {isOrderModalOpen && order !== undefined && (
        <ChangeOrderModal
          open={isOrderModalOpen}
          onOpenChange={setIsOrderModalOpen}
          currentOrder={order}
          maxOrder={totalItems}
          title={youtubeItem.title}
          onConfirm={handleOrderChange}
        />
      )}
    </>
  );
}

