"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAvatar } from "@/contexts/avatar-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserRound, LogOut, Settings, Moon, Sun, Link2 } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface UserProfileButtonProps {
  hasHeroSection?: boolean;
}

export function UserProfileButton({ hasHeroSection = false }: UserProfileButtonProps) {
  const { user } = useUser();
  const { data: currentUser } = useCurrentUser();
  const { avatarUrl: contextAvatarUrl } = useAvatar();
  const { openUserProfile, signOut } = useClerk();
  const { setTheme, theme } = useTheme();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Get full name (firstname + lastname) or fallback to username
  const fullName = currentUser?.displayName || 
    (user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user?.firstName || null);
  
  const username = currentUser?.username || user?.username || "";
  // Use full name if available, otherwise fallback to username
  const displayName = fullName || username || "User";
  
  const avatarUrl = contextAvatarUrl || currentUser?.avatarUrl || user?.imageUrl || undefined;
  const initials = (currentUser?.username || user?.username || user?.firstName || "U")[0].toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    router.push("/browse");
  };

  // Toggle only between light and dark (no system option in this menu)
  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 rounded-full transition-colors duration-300 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 cursor-pointer",
              hasHeroSection 
                ? "hover:bg-black/20 p-1" 
                : "hover:bg-accent p-1"
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[280px]">
          <div className="flex items-center gap-3 px-2 py-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="text-base">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              {username && fullName && username !== fullName && (
                <p className="text-xs text-muted-foreground truncate">@{username}</p>
              )}
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              openUserProfile();
              setIsDropdownOpen(false);
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Manage Account</span>
          </DropdownMenuItem>

          <Link href="/dashboard/profile">
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                setTimeout(() => setIsDropdownOpen(false), 100);
              }}
            >
              <UserRound className="mr-2 h-4 w-4" />
              <span>Your Profile</span>
            </DropdownMenuItem>
          </Link>

          <DropdownMenuSeparator />

          <Link href="/settings">
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                setTimeout(() => setIsDropdownOpen(false), 100);
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          </Link>
          <Link href={username ? `/links/${username}` : "/settings?section=links"}>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                setTimeout(() => setIsDropdownOpen(false), 100);
              }}
            >
              <Link2 className="mr-2 h-4 w-4" />
              <span>Link in bio</span>
            </DropdownMenuItem>
          </Link>

          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
            }}
            onClick={(e) => {
              // Allow clicking anywhere on the row to toggle
              e.preventDefault();
              handleThemeToggle();
            }}
          >
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex items-center">
                {theme === "dark" ? (
                  <Moon className="mr-2 h-4 w-4" />
                ) : (
                  <Sun className="mr-2 h-4 w-4" />
                )}
                <span>Theme</span>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => {
                  setTheme(checked ? "dark" : "light");
                }}
                className="ml-2 data-[state=checked]:bg-zinc-700 dark:data-[state=checked]:bg-zinc-600"
              />
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer text-destructive focus:text-destructive"
            onSelect={(e) => {
              e.preventDefault();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

