"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/social/follow-button";
import { Bookmark, BookmarkCheck, List, Heart, Eye, FileText } from "lucide-react";
import type { MemberCardUser } from "./member-card-compact";
import { cn } from "@/lib/utils";

interface MemberCardListProps {
  user: MemberCardUser;
  currentUserId?: string | null;
  isSignedIn: boolean;
  onBookmarkClick?: (userId: string) => void;
  isBookmarked?: boolean;
  isBookmarkPending?: boolean;
}

export function MemberCardList({
  user,
  currentUserId,
  isSignedIn,
  onBookmarkClick,
  isBookmarked = false,
  isBookmarkPending = false,
}: MemberCardListProps) {
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
  const watchedCount = user.watchedCount ?? 0;
  const likedCount = user.likedCount ?? 0;
  const reviewsCount = user.reviewsCount ?? 0;

  return (
    <div
      className={cn(
        "border rounded-xl p-4 transition-colors",
        "bg-sky-50/90 dark:bg-zinc-900/80",
        "hover:border-primary/50"
      )}
    >
      {/* User details row: avatar, name + username, bookmark */}
      <div className="flex items-start gap-3 mb-3">
        <Link href={`/users/${user.id}`} className="cursor-pointer">
          <Avatar className="h-12 w-12 cursor-pointer">
            <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/users/${user.id}`} className="cursor-pointer">
            <h3 className="font-semibold hover:underline truncate">{displayName}</h3>
          </Link>
          <p className="text-sm text-muted-foreground truncate">@{username}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full cursor-pointer"
          aria-label={isBookmarked ? "Unbookmark" : "Bookmark"}
          onClick={() => onBookmarkClick?.(user.id)}
          disabled={isBookmarkPending}
        >
          {isBookmarked ? (
            <BookmarkCheck className="h-4 w-4 text-primary" />
          ) : (
            <Bookmark className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>

      {user.bio && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{user.bio}</p>
      )}

      {/* Stats: same as compact - list, watched, liked, reviews */}
      <div className="rounded-[15px] border border-border/60 bg-muted/20 px-3 py-2.5 flex items-center justify-around gap-1 flex-wrap mb-3">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground" title="Lists & playlists">
          <List className="h-4 w-4 shrink-0 text-blue-500" />
          <span className="font-medium text-foreground">{listsDisplay}</span>
        </span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground" title="Movies & TV marked as seen">
          <Eye className="h-4 w-4 shrink-0 text-green-500" />
          <span className="font-medium text-foreground">{watchedCount}</span>
        </span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground" title="Movies liked">
          <Heart className="h-4 w-4 shrink-0 text-rose-500" />
          <span className="font-medium text-foreground">{likedCount}</span>
        </span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground" title="Reviews">
          <FileText className="h-4 w-4 shrink-0 text-amber-500" />
          <span className="font-medium text-foreground">{reviewsCount}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          asChild
          size="sm"
          className="flex-1 rounded-[15px] border-0 bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100 cursor-pointer"
        >
          <Link href={`/users/${user.id}`} className="cursor-pointer">View Profile</Link>
        </Button>
        {isSignedIn && currentUserId !== user.id && (
          <FollowButton
            userId={user.id}
            size="sm"
            variant="default"
            className="rounded-[15px] cursor-pointer"
          />
        )}
      </div>
    </div>
  );
}
