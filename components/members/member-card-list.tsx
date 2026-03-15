"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/social/follow-button";
import type { MemberCardUser } from "./member-card-compact";

interface MemberCardListProps {
  user: MemberCardUser;
  currentUserId?: string | null;
  isSignedIn: boolean;
}

export function MemberCardList({ user, currentUserId, isSignedIn }: MemberCardListProps) {
  const displayName = user.username || user.displayName || "Unknown";
  const username = user.username || user.id.slice(0, 8);
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const listsDisplay =
    currentUserId === user.id && user.allListsCount != null ? user.allListsCount : user.listsCount;

  return (
    <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <Link href={`/users/${user.id}`}>
          <Avatar className="h-12 w-12 cursor-pointer">
            <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/users/${user.id}`}>
            <h3 className="font-semibold hover:underline truncate">{displayName}</h3>
          </Link>
          <p className="text-sm text-muted-foreground truncate">@{username}</p>
        </div>
      </div>

      {user.bio && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{user.bio}</p>
      )}

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <span>{user.followersCount} followers</span>
        <span>•</span>
        <span
          title={
            currentUserId === user.id && user.allListsCount != null
              ? "Your total lists + playlists"
              : undefined
          }
        >
          {listsDisplay} lists
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href={`/users/${user.id}`}>View Profile</Link>
        </Button>
        {isSignedIn && currentUserId !== user.id && (
          <FollowButton userId={user.id} size="sm" variant="default" />
        )}
      </div>
    </div>
  );
}
