"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFollowing, useFollowers } from "@/hooks/use-follow";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "./follow-button";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

export default function SocialContent() {
  const [activeTab, setActiveTab] = useState<"following" | "followers">(
    "following"
  );
  const { data: followingData, isLoading: isLoadingFollowing } = useFollowing();
  const { data: followersData, isLoading: isLoadingFollowers } = useFollowers();
  const isMobile = useIsMobile();

  const following = followingData?.following || [];
  const followers = followersData?.followers || [];

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="container max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Social</h1>
          <p className="text-muted-foreground mt-2">
            Manage who you follow and see who follows you
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Mobile: Select Dropdown */}
          {isMobile ? (
            <div className="mb-6">
              <Select
                value={activeTab}
                onValueChange={(v) =>
                  setActiveTab(v as "following" | "followers")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {activeTab === "following" && (
                      <span className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Following ({following.length})
                      </span>
                    )}
                    {activeTab === "followers" && (
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Followers ({followers.length})
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="following">
                    <span className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Following ({following.length})
                    </span>
                  </SelectItem>
                  <SelectItem value="followers">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Followers ({followers.length})
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            /* Desktop: Tabs */
            <Tabs
              value={activeTab}
              onValueChange={(v) =>
                setActiveTab(v as "following" | "followers")
              }
            >
              <TabsList>
                <TabsTrigger
                  value="following"
                  className="flex items-center gap-2"
                >
                  <UserCheck className="h-4 w-4" />
                  Following ({following.length})
                </TabsTrigger>
                <TabsTrigger
                  value="followers"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Followers ({followers.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Tab Content */}
          <div className={isMobile ? "" : "mt-6"}>
            {activeTab === "following" && (
              <>
                {isLoadingFollowing ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Followed</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-24" />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell className="text-right">
                              <Skeleton className="h-9 w-24 ml-auto" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : following.length === 0 ? (
                  <div className="text-center py-12">
                    <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Not following anyone yet
                    </h3>
                    <p className="text-muted-foreground">
                      Start following users to see their playlists and activity
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Followed</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {following.map((user) => {
                          const displayName =
                            user.displayName || user.username || "Unknown User";
                          const initials = displayName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2);
                          return (
                            <TableRow
                              key={user.id}
                              className="hover:bg-muted/50"
                            >
                              <TableCell>
                                <Link
                                  href={`/users/${user.id}`}
                                  className="flex items-center gap-3 hover:text-primary transition-colors"
                                >
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage
                                      src={user.avatarUrl || undefined}
                                      alt={displayName}
                                    />
                                    <AvatarFallback>{initials}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold">
                                      {displayName}
                                    </p>
                                    {user.username && (
                                      <p className="text-sm text-muted-foreground">
                                        @{user.username}
                                      </p>
                                    )}
                                  </div>
                                </Link>
                              </TableCell>
                              <TableCell>
                                {user.followedAt && (
                                  <span className="text-sm text-muted-foreground">
                                    {formatDistanceToNow(
                                      new Date(user.followedAt),
                                      { addSuffix: true }
                                    )}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <FollowButton userId={user.id} size="sm" />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {activeTab === "followers" && (
              <>
                {isLoadingFollowers ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-24" />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Skeleton className="h-9 w-24 ml-auto" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : followers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No followers yet
                    </h3>
                    <p className="text-muted-foreground">
                      Share your playlists to get followers
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {followers.map((user) => {
                          const displayName =
                            user.displayName || user.username || "Unknown User";
                          const initials = displayName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2);
                          return (
                            <TableRow
                              key={user.id}
                              className="hover:bg-muted/50"
                            >
                              <TableCell>
                                <Link
                                  href={`/users/${user.id}`}
                                  className="flex items-center gap-3 hover:text-primary transition-colors"
                                >
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage
                                      src={user.avatarUrl || undefined}
                                      alt={displayName}
                                    />
                                    <AvatarFallback>{initials}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold">
                                      {displayName}
                                    </p>
                                    {user.username && (
                                      <p className="text-sm text-muted-foreground">
                                        @{user.username}
                                      </p>
                                    )}
                                  </div>
                                </Link>
                              </TableCell>
                              <TableCell className="text-right">
                                <FollowButton userId={user.id} size="sm" />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
