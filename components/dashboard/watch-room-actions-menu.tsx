"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type WatchRoomActionsMenuProps = {
  title: string;
  onCopyInviteLink?: () => void;
};

/**
 * Secondary actions that are not duplicated on the card surface.
 * Playback (pause / finish / leave) stays on the card header for one-tap access.
 */
export function WatchRoomActionsMenu({ title, onCopyInviteLink }: WatchRoomActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => e.stopPropagation()}
          className="h-8 w-8 shrink-0 cursor-pointer rounded-full text-muted-foreground hover:bg-muted"
          aria-label={`More for ${title}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          className="cursor-pointer text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onCopyInviteLink?.();
          }}
        >
          Copy invite link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
