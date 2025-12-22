"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "./follow-button";
import { User } from "@/hooks/use-follow";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAvatar } from "@/contexts/avatar-context";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface UserCardProps {
  user: User;
  showFollowButton?: boolean;
  showFollowedAt?: boolean;
}

export function UserCard({ user, showFollowButton = true, showFollowedAt = false }: UserCardProps) {
  const { data: currentUser } = useCurrentUser();
  const { avatarUrl: contextAvatarUrl } = useAvatar();
  const displayName = user.username || user.displayName || "Unknown User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const isCurrentUser = currentUser?.id === user.id;

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <Link href={`/users/${user.id}`} className="flex items-center gap-4 flex-1 min-w-0">
        <Avatar className="h-12 w-12 flex-shrink-0">
          <AvatarImage 
            src={isCurrentUser && contextAvatarUrl ? contextAvatarUrl : user.avatarUrl || undefined} 
            alt={displayName} 
          />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{displayName}</p>
          {user.username && (
            <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
          )}
          {user.bio && (
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{user.bio}</p>
          )}
          {showFollowedAt && user.followedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(user.followedAt), { addSuffix: true })}
            </p>
          )}
        </div>
      </Link>
      {showFollowButton && (
        <div className="flex-shrink-0">
          <FollowButton userId={user.id} size="sm" />
        </div>
      )}
    </div>
  );
}

