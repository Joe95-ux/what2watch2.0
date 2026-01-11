"use client";

import { useState } from "react";
import { MoreVertical, Youtube, Bookmark, List, BookOpen, Activity, UsersRound, ClipboardList, Compass, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  hasHeroSection?: boolean;
}

export function UserMenu({ hasHeroSection = false }: UserMenuProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLinkClick = () => {
    setTimeout(() => setIsDropdownOpen(false), 100);
  };

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("cursor-pointer",
          "h-9 w-9 transition-colors duration-300",
          hasHeroSection && "hover:bg-black/20"
        )}>
          <MoreVertical className={cn(
            "h-5 w-5 transition-colors duration-300",
            hasHeroSection && "text-white"
          )} />
          <span className="sr-only">User menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[18rem] p-3">
        <div className="space-y-4">
          {/* First Section: Watchlist, Lists, Playlists, Diary */}
          <div className="grid grid-cols-2 gap-2">
            <Link href="/dashboard/watchlist" onClick={handleLinkClick}>
              <div className="flex flex-col items-center gap-2 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                <Bookmark className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium">Watchlist</span>
              </div>
            </Link>
            <Link href="/dashboard/lists" onClick={handleLinkClick}>
              <div className="flex flex-col items-center gap-2 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium">Lists</span>
              </div>
            </Link>
            <Link href="/dashboard/playlists" onClick={handleLinkClick}>
              <div className="flex flex-col items-center gap-2 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                <List className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium">Playlists</span>
              </div>
            </Link>
            <Link href="/dashboard/diary" onClick={handleLinkClick}>
              <div className="flex flex-col items-center gap-2 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium">Diary</span>
              </div>
            </Link>
          </div>

          {/* Other Items */}
          <div className="space-y-0">
            <Link
              href="/dashboard"
              onClick={handleLinkClick}
              className="flex items-center rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <LayoutDashboard className="mr-3 h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/browse/personalized"
              onClick={handleLinkClick}
              className="flex items-center rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <Compass className="mr-3 h-4 w-4" />
              <span>Guide</span>
            </Link>
            <Link
              href="/dashboard/activity"
              onClick={handleLinkClick}
              className="flex items-center rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <Activity className="mr-3 h-4 w-4" />
              <span>Activity</span>
            </Link>
            <Link
              href="/dashboard/profile"
              onClick={handleLinkClick}
              className="flex items-center rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <UsersRound className="mr-3 h-4 w-4" />
              <span>Profile</span>
            </Link>
            <Link
              href="/dashboard/youtube/management"
              onClick={handleLinkClick}
              className="flex items-center rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <Youtube className="mr-3 h-4 w-4" />
              <span>YouTube Feed</span>
            </Link>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

