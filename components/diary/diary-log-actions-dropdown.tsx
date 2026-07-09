"use client";

import { useState } from "react";
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
import { ResponsiveMenuSurface } from "@/components/ui/responsive-menu-surface";
import { ShareActionRows, ShareMenuItems } from "@/components/ui/share-dropdown";
import { useIsMobile } from "@/hooks/use-mobile";
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

const actionRowClass =
  "flex w-full items-center gap-2 px-4 py-3 text-sm font-medium cursor-pointer hover:bg-muted transition-colors";

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
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-[20px] border border-border/30 bg-muted/25 hover:bg-muted/45 dark:border-border/40 dark:bg-muted/40 dark:hover:bg-muted/65 cursor-pointer flex-shrink-0"
      aria-label="More actions"
    >
      <MoreVertical className="h-4 w-4" />
    </Button>
  );

  const closeMenu = () => setOpen(false);

  if (isMobile) {
    return (
      <ResponsiveMenuSurface
        open={open}
        onOpenChange={setOpen}
        trigger={trigger}
        accessibilityTitle="Diary actions"
        header={<p className="text-base font-semibold">Actions</p>}
        drawerClassName="max-h-[80vh]"
        bodyClassName="px-0 py-0"
      >
        <button
          type="button"
          className={actionRowClass}
          onClick={() => {
            void onLikeToggle();
            closeMenu();
          }}
        >
          <Heart
            className={cn(
              "h-4 w-4",
              isLiked ? "text-red-500 fill-red-500" : ""
            )}
          />
          {isLiked ? "Favorited" : "Favorite"}
        </button>
        <button
          type="button"
          className={actionRowClass}
          onClick={() => {
            void onWatchlistToggle();
            closeMenu();
          }}
        >
          <Bookmark
            className={cn(
              "h-4 w-4",
              isInWatchlist ? "text-blue-500 fill-blue-500" : ""
            )}
          />
          {isInWatchlist ? "In Watchlist" : "Watchlist"}
        </button>
        <div className="border-t border-border">
          <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Share2 className="h-3.5 w-3.5" />
            Share
          </div>
          <ShareActionRows
            shareUrl={shareUrl}
            title={shareTitle}
            description={shareDescription}
            onAction={closeMenu}
          />
        </div>
        {isOwner ? (
          <div className="border-t border-border">
            <button
              type="button"
              className={cn(actionRowClass, "text-destructive")}
              onClick={() => {
                onDeleteClick();
                closeMenu();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        ) : null}
      </ResponsiveMenuSurface>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => void onLikeToggle()} className="cursor-pointer">
          <Heart
            className={cn(
              "h-4 w-4 mr-2",
              isLiked ? "text-red-500 fill-red-500" : ""
            )}
          />
          {isLiked ? "Favorited" : "Favorite"}
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
