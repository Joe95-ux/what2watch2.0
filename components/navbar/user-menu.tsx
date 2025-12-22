"use client";

import { useState } from "react";
import { MoreVertical, LayoutDashboard, Youtube, Bookmark, List, BookOpen, Activity, User, ClipboardList, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  hasHeroSection?: boolean;
}

export function UserMenu({ hasHeroSection = false }: UserMenuProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn(
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
      <DropdownMenuContent align="end" className="w-[18rem]">
        <Link href="/dashboard">
          <DropdownMenuItem 
            className="cursor-pointer"
            onSelect={(e) => {
              // Prevent default closing behavior - close manually after navigation
              e.preventDefault();
              setTimeout(() => setIsDropdownOpen(false), 100);
            }}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />

        <Link href="/browse/personalized">
          <DropdownMenuItem 
            className="cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              setTimeout(() => setIsDropdownOpen(false), 100);
            }}
          >
            <Compass className="mr-2 h-4 w-4" />
            <span>Guide</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />

        <Link href="/dashboard/watchlist">
          <DropdownMenuItem 
            className="cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              setTimeout(() => setIsDropdownOpen(false), 100);
            }}
          >
            <Bookmark className="mr-2 h-4 w-4" />
            <span>Watchlist</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />

        <Link href="/dashboard/playlists">
          <DropdownMenuItem 
            className="cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              setTimeout(() => setIsDropdownOpen(false), 100);
            }}
          >
            <List className="mr-2 h-4 w-4" />
            <span>Playlists</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />

        <Link href="/dashboard/lists">
          <DropdownMenuItem 
            className="cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              setTimeout(() => setIsDropdownOpen(false), 100);
            }}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            <span>Lists</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />

        <Link href="/dashboard/diary">
          <DropdownMenuItem 
            className="cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              setTimeout(() => setIsDropdownOpen(false), 100);
            }}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            <span>Diary</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />

        <Link href="/dashboard/activity">
          <DropdownMenuItem 
            className="cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              setTimeout(() => setIsDropdownOpen(false), 100);
            }}
          >
            <Activity className="mr-2 h-4 w-4" />
            <span>Activity</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />

        <Link href="/dashboard/profile">
          <DropdownMenuItem 
            className="cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              setTimeout(() => setIsDropdownOpen(false), 100);
            }}
          >
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />

        <Link href="/dashboard/youtube/management">
          <DropdownMenuItem 
            className="cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              setTimeout(() => setIsDropdownOpen(false), 100);
            }}
          >
            <Youtube className="mr-2 h-4 w-4" />
            <span>YouTube Management</span>
          </DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

