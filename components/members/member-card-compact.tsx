"use client";

import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/social/follow-button";
import { Bookmark, List, Heart, BookmarkCheck, Eye, FileText } from "lucide-react";
import { BANNER_GRADIENTS } from "@/components/social/banner-gradient-selector";
import { cn } from "@/lib/utils";

const DEFAULT_BANNER_GRADIENT = "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)";

export interface MemberCardUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  bannerUrl?: string | null;
  bannerGradientId?: string | null;
  followersCount: number;
  followingCount?: number;
  listsCount: number;
  watchedCount?: number;
  likedCount?: number;
  reviewsCount?: number;
  allListsCount?: number;
  isFollowing: boolean;
}

interface MemberCardCompactProps {
  user: MemberCardUser;
  currentUserId?: string | null;
  isSignedIn: boolean;
  onBookmarkClick?: (userId: string) => void;
  isBookmarked?: boolean;
  isBookmarkPending?: boolean;
}

export function MemberCardCompact({
  user,
  currentUserId,
  isSignedIn,
  onBookmarkClick,
  isBookmarked = false,
  isBookmarkPending = false,
}: MemberCardCompactProps) {
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

  const bannerStyle = user.bannerUrl
    ? undefined
    : (() => {
        const g = BANNER_GRADIENTS.find((x) => x.id === (user.bannerGradientId || "gradient-1"));
        return { background: g?.gradient ?? DEFAULT_BANNER_GRADIENT };
      })();

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden transition-colors",
        "bg-sky-50/90 dark:bg-zinc-900/80",
        "hover:border-primary/50"
      )}
    >
      {/* Banner with avatar and follow button tucked in */}
      <div className="relative h-20 w-full shrink-0">
        {user.bannerUrl ? (
          <>
            <Image
              src={user.bannerUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 33vw"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0" style={bannerStyle}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}
        {/* Avatar - tucked under banner, left */}
        <div className="absolute bottom-0 left-4 translate-y-1/2">
          <Link href={`/users/${user.id}`} className="block cursor-pointer">
            <Avatar className="h-14 w-14 border-2 border-background shadow-md cursor-pointer ring-2 ring-background">
              <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-lg bg-muted">{initials}</AvatarFallback>
            </Avatar>
          </Link>
        </div>
        {/* Follow button - tucked under banner, right */}
        {isSignedIn && currentUserId !== user.id && (
          <div className="absolute bottom-0 right-4 translate-y-1/2">
            <FollowButton
              userId={user.id}
              size="sm"
              variant="default"
              className="rounded-[20px] shadow-md cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Name row: display name + username left, bookmark right */}
      <div className="flex items-start justify-between gap-2 px-4 pt-9 pb-3">
        <div className="min-w-0 flex-1">
          <Link href={`/users/${user.id}`} className="cursor-pointer">
            <h3 className="font-semibold truncate hover:underline">{displayName}</h3>
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

      {/* Stats: list, watched, liked, reviews - bordered box */}
      <div className="px-4 pb-4">
        <div className="rounded-[15px] border border-border/60 bg-muted/20 px-3 py-2.5 flex items-center justify-around gap-1 flex-wrap">
          <span
            className="flex items-center gap-1.5 text-sm text-muted-foreground"
            title="Lists & playlists"
          >
            <List className="h-4 w-4 shrink-0 text-blue-500" />
            <span className="font-medium text-foreground">{listsDisplay}</span>
          </span>
          <span
            className="flex items-center gap-1.5 text-sm text-muted-foreground"
            title="Movies & TV marked as seen"
          >
            <Eye className="h-4 w-4 shrink-0 text-green-500" />
            <span className="font-medium text-foreground">{watchedCount}</span>
          </span>
          <span
            className="flex items-center gap-1.5 text-sm text-muted-foreground"
            title="Movies liked"
          >
            <Heart className="h-4 w-4 shrink-0 text-rose-500" />
            <span className="font-medium text-foreground">{likedCount}</span>
          </span>
          <span
            className="flex items-center gap-1.5 text-sm text-muted-foreground"
            title="Reviews"
          >
            <FileText className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="font-medium text-foreground">{reviewsCount}</span>
          </span>
        </div>

        <Button
          asChild
          size="sm"
          className="mt-3 w-full rounded-[20px] border-0 bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100 cursor-pointer"
        >
          <Link href={`/users/${user.id}`} className="cursor-pointer">View Profile</Link>
        </Button>
      </div>
    </div>
  );
}
