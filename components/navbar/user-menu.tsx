"use client";

import { useState } from "react";
import { MoreVertical, Settings, LogOut, Moon, Sun, Monitor, LayoutDashboard } from "lucide-react";
import { YouTubeChannelExtractor } from "@/components/tools/youtube-channel-extractor";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  hasHeroSection?: boolean;
}

export function UserMenu({ hasHeroSection = false }: UserMenuProps) {
  const { setTheme, theme } = useTheme();
  const router = useRouter();
  const { signOut } = useClerk();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

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
      <DropdownMenuContent align="end" className="w-56">
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
        <Link href="/settings">
          <DropdownMenuItem 
            className="cursor-pointer"
            onSelect={(e) => {
              // Prevent default closing behavior - close manually after navigation
              e.preventDefault();
              setTimeout(() => setIsDropdownOpen(false), 100);
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </Link>

        <DropdownMenuSeparator />

        {/* Theme Toggle */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            {theme === "light" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : theme === "dark" ? (
              <Moon className="mr-2 h-4 w-4" />
            ) : (
              <Monitor className="mr-2 h-4 w-4" />
            )}
            <span>Theme</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={() => {
                setTheme("light");
                // Close menu after theme change
                setTimeout(() => setIsDropdownOpen(false), 100);
              }}
              className="cursor-pointer"
              onSelect={(e) => {
                // Prevent default closing behavior - close manually
                e.preventDefault();
              }}
            >
              <Sun className="mr-2 h-4 w-4" />
              <span>Light</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setTheme("dark");
                // Close menu after theme change
                setTimeout(() => setIsDropdownOpen(false), 100);
              }}
              className="cursor-pointer"
              onSelect={(e) => {
                // Prevent default closing behavior - close manually
                e.preventDefault();
              }}
            >
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setTheme("system");
                // Close menu after theme change
                setTimeout(() => setIsDropdownOpen(false), 100);
              }}
              className="cursor-pointer"
              onSelect={(e) => {
                // Prevent default closing behavior - close manually
                e.preventDefault();
              }}
            >
              <Monitor className="mr-2 h-4 w-4" />
              <span>System</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <YouTubeChannelExtractor onOpenChange={setIsDropdownOpen} />
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            handleSignOut();
            // Close menu after sign out
            setTimeout(() => setIsDropdownOpen(false), 100);
          }}
          className="cursor-pointer text-destructive focus:text-destructive"
          onSelect={(e) => {
            // Prevent default closing behavior - close manually
            e.preventDefault();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

