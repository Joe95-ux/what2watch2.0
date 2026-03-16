"use client";

import { Heart, Bookmark, Share2, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareMenuItems } from "@/components/ui/share-dropdown";
import { cn } from "@/lib/utils";

interface DiaryLogActionsDropdownProps {
  shareUrl: string;
  shareTitle: string;
  shareDescription: string;
  isLiked: boolean;
  isInWatchlist: boolean;
  isOwner: boolean;
  onLikeToggle: () => void | Promise<void>;
  onWatchlistToggle: () => void | Promise<void>;
  onDeleteClick: () => void;
}

export function DiaryLogActionsDropdown({
  shareUrl,
  shareTitle,
  shareDescription,
  isLiked,
  isInWatchlist,
  isOwner,
  onLikeToggle,
  onWatchlistToggle,
  onDeleteClick,
}: DiaryLogActionsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-[20px] border-none bg-muted/50 hover:bg-muted cursor-pointer flex-shrink-0"
          aria-label="More actions"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => void onLikeToggle()} className="cursor-pointer">
          <Heart
            className={cn(
              "h-4 w-4 mr-2",
              isLiked ? "text-red-500 fill-red-500" : ""
            )}
          />
          {isLiked ? "Liked" : "Like"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void onWatchlistToggle()} className="cursor-pointer">
          <Bookmark
            className={cn(
              "h-4 w-4 mr-2",
              isInWatchlist ? "text-blue-500 fill-blue-500" : ""
            )}
          />
          {isInWatchlist ? "In Watchlist" : "Watchlist"}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <ShareMenuItems
              shareUrl={shareUrl}
              title={shareTitle}
              description={shareDescription}
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {isOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDeleteClick}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
