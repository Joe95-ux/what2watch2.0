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
import { AvatarPickerDialog } from "@/components/avatar/avatar-picker-dialog";
import { UserCircle, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserProfileButtonProps {
  hasHeroSection?: boolean;
}

export function UserProfileButton({ hasHeroSection = false }: UserProfileButtonProps) {
  const { user } = useUser();
  const { data: currentUser } = useCurrentUser();
  const { avatarUrl: contextAvatarUrl } = useAvatar();
  const { openUserProfile, signOut } = useClerk();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);

  const displayName = currentUser?.displayName || 
    (user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user?.firstName || user?.username || "User");
  
  const username = currentUser?.username || user?.username || "";
  const avatarUrl = contextAvatarUrl || currentUser?.avatarUrl || user?.imageUrl || undefined;
  const initials = (currentUser?.username || user?.username || user?.firstName || "U")[0].toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
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
          <div className="flex items-center gap-3 px-2 py-3 border-b">
            <Avatar className="h-12 w-12">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="text-base">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              {username && (
                <p className="text-xs text-muted-foreground truncate">@{username}</p>
              )}
            </div>
          </div>

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

          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              setIsAvatarEditorOpen(true);
              setIsDropdownOpen(false);
            }}
          >
            <UserCircle className="mr-2 h-4 w-4" />
            <span>Edit Avatar</span>
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
      <AvatarPickerDialog
        isOpen={isAvatarEditorOpen}
        onClose={() => setIsAvatarEditorOpen(false)}
        currentAvatarUrl={avatarUrl}
      />
    </>
  );
}

