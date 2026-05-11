"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type WatchRoomActionsMenuProps = {
  title: string;
  onCopyInviteLink?: () => void;
  /** Host-only: ends the Mongo watch party and clears `?party=` from the URL. */
  onEndParty?: () => void | Promise<void>;
  isEndingParty?: boolean;
  /** Guest: leaves participation and clears `?party=` from the URL. */
  onLeaveParty?: () => void | Promise<void>;
  isLeavingParty?: boolean;
};

/**
 * Secondary actions that are not duplicated on the card surface.
 * Playback (pause / finish / leave) stays on the card header for one-tap access.
 */
export function WatchRoomActionsMenu({
  title,
  onCopyInviteLink,
  onEndParty,
  isEndingParty = false,
  onLeaveParty,
  isLeavingParty = false,
}: WatchRoomActionsMenuProps) {
  const partyActionBusy = isEndingParty || isLeavingParty;
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
          title="Creates or reuses your watch party for this title and copies a shareable link."
          onClick={(e) => {
            e.stopPropagation();
            onCopyInviteLink?.();
          }}
          disabled={partyActionBusy}
        >
          Copy invite link
        </DropdownMenuItem>
        {onEndParty ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-xs text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                void onEndParty();
              }}
              disabled={partyActionBusy}
            >
              {isEndingParty ? "Ending…" : "End watch party"}
            </DropdownMenuItem>
          </>
        ) : onLeaveParty ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-xs"
              onClick={(e) => {
                e.stopPropagation();
                void onLeaveParty();
              }}
              disabled={partyActionBusy}
            >
              {isLeavingParty ? "Leaving…" : "Leave watch party"}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
