"use client";

import Link from "next/link";
import { Bookmark, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/social/follow-button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MemberCardUser } from "@/components/members/member-card-compact";
import { cn } from "@/lib/utils";

export type MemberTableUser = MemberCardUser & {
  isBookmarked?: boolean;
};

type MemberTableProps = {
  users: MemberTableUser[];
  currentUserId?: string | null;
  isSignedIn: boolean;
  onBookmarkClick?: (userId: string) => void;
  bookmarkPendingId?: string | null;
};

function memberDisplayName(user: MemberTableUser) {
  return user.displayName || user.username || "Unknown";
}

function memberUsername(user: MemberTableUser) {
  return user.username ? `@${user.username}` : `@${user.id.slice(0, 8)}`;
}

function memberInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MemberTable({
  users,
  currentUserId,
  isSignedIn,
  onBookmarkClick,
  bookmarkPendingId,
}: MemberTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden mb-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Followers</TableHead>
            <TableHead className="text-right hidden md:table-cell">Following</TableHead>
            <TableHead className="text-right">Lists</TableHead>
            <TableHead className="text-right hidden lg:table-cell">Watched</TableHead>
            <TableHead className="text-right hidden lg:table-cell">Liked</TableHead>
            <TableHead className="text-right hidden xl:table-cell">Reviews</TableHead>
            <TableHead className="w-[140px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                No members found
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => {
              const name = memberDisplayName(user);
              const listsDisplay =
                currentUserId === user.id && user.allListsCount != null
                  ? user.allListsCount
                  : user.listsCount;

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-0">
                      <Link href={`/users/${user.id}`} className="cursor-pointer shrink-0">
                        <Avatar className="h-9 w-9 cursor-pointer">
                          <AvatarImage src={user.avatarUrl || undefined} alt={name} />
                          <AvatarFallback>{memberInitials(name)}</AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="min-w-0">
                        <Link
                          href={`/users/${user.id}`}
                          className="font-medium hover:underline truncate block cursor-pointer"
                        >
                          {name}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate">{memberUsername(user)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell tabular-nums">
                    {user.followersCount}
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell tabular-nums">
                    {user.followingCount ?? 0}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{listsDisplay}</TableCell>
                  <TableCell className="text-right hidden lg:table-cell tabular-nums">
                    {user.watchedCount ?? 0}
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell tabular-nums">
                    {user.likedCount ?? 0}
                  </TableCell>
                  <TableCell className="text-right hidden xl:table-cell tabular-nums">
                    {user.reviewsCount ?? 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {isSignedIn && currentUserId !== user.id ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            aria-label={user.isBookmarked ? "Remove favorite" : "Add favorite"}
                            onClick={() => onBookmarkClick?.(user.id)}
                            disabled={bookmarkPendingId === user.id}
                          >
                            <Bookmark
                              className={cn(
                                "h-4 w-4",
                                user.isBookmarked
                                  ? "fill-green-500 text-green-500"
                                  : "text-muted-foreground"
                              )}
                            />
                          </Button>
                          <FollowButton
                            userId={user.id}
                            size="sm"
                            variant="outline"
                            iconVariant="round"
                            className="h-8 cursor-pointer"
                          />
                        </>
                      ) : null}
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        aria-label="View profile"
                      >
                        <Link href={`/users/${user.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function MemberTableSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="border rounded-lg overflow-hidden mb-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Followers</TableHead>
            <TableHead className="text-right hidden md:table-cell">Following</TableHead>
            <TableHead className="text-right">Lists</TableHead>
            <TableHead className="text-right hidden lg:table-cell">Watched</TableHead>
            <TableHead className="text-right hidden lg:table-cell">Liked</TableHead>
            <TableHead className="text-right hidden xl:table-cell">Reviews</TableHead>
            <TableHead className="w-[140px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Skeleton className="h-4 w-8 ml-auto" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-4 w-8 ml-auto" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-8 ml-auto" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Skeleton className="h-4 w-8 ml-auto" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Skeleton className="h-4 w-8 ml-auto" />
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <Skeleton className="h-4 w-8 ml-auto" />
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
