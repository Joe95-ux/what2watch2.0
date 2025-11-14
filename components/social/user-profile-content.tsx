"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "./follow-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserFollowers, useUserFollowing, useIsFollowing } from "@/hooks/use-follow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PlaylistRow from "@/components/browse/playlist-row";
import { Playlist } from "@/hooks/use-playlists";
import { Users, UserCheck, List } from "lucide-react";

interface UserProfileContentProps {
  userId?: string;
}

export default function UserProfileContent({ userId: propUserId }: UserProfileContentProps = {}) {
  const params = useParams();
  const userId = propUserId || (params?.userId as string) || "";

  // Fetch user data
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ["user", userId, "profile"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/profile`);
      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }
      return response.json();
    },
    enabled: !!userId,
  });

  const { data: followersData } = useUserFollowers(userId);
  const { data: followingData } = useUserFollowing(userId);
  const { data: playlistsData, isLoading: isLoadingPlaylists } = useQuery({
    queryKey: ["user", userId, "playlists"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/playlists`);
      if (!response.ok) {
        throw new Error("Failed to fetch playlists");
      }
      return response.json();
    },
    enabled: !!userId,
  });

  const user = userData?.user;
  const playlists = playlistsData?.playlists || [];
  const followers = followersData?.followers || [];
  const following = followingData?.following || [];

  if (isLoadingUser) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center gap-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">User not found</h2>
          <p className="text-muted-foreground">The user you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  const displayName = user.displayName || user.username || "Unknown User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b">
        <Avatar className="h-24 w-24 flex-shrink-0">
          <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
          <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{displayName}</h1>
          {user.username && (
            <p className="text-muted-foreground mb-4">@{user.username}</p>
          )}
          {user.bio && (
            <p className="text-sm text-muted-foreground mb-4">{user.bio}</p>
          )}
          <div className="flex items-center gap-6 mb-4">
            <div>
              <span className="font-semibold">{followers.length}</span>
              <span className="text-muted-foreground ml-1">followers</span>
            </div>
            <div>
              <span className="font-semibold">{following.length}</span>
              <span className="text-muted-foreground ml-1">following</span>
            </div>
            <div>
              <span className="font-semibold">{playlists.length}</span>
              <span className="text-muted-foreground ml-1">playlists</span>
            </div>
          </div>
          <FollowButton userId={userId} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="playlists" className="w-full">
        <TabsList>
          <TabsTrigger value="playlists" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Playlists ({playlists.length})
          </TabsTrigger>
          <TabsTrigger value="followers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Followers ({followers.length})
          </TabsTrigger>
          <TabsTrigger value="following" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Following ({following.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="playlists" className="mt-6">
          {isLoadingPlaylists ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
              ))}
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-12">
              <List className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No playlists yet</h3>
              <p className="text-muted-foreground">This user hasn&apos;t created any playlists.</p>
            </div>
          ) : (
            <PlaylistRow title="" playlists={playlists as Playlist[]} href="/playlists" />
          )}
        </TabsContent>

        <TabsContent value="followers" className="mt-6">
          <div className="space-y-4">
            {followers.map((follower) => (
              <div key={follower.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={follower.avatarUrl || undefined} alt={follower.displayName || ""} />
                  <AvatarFallback>
                    {(follower.displayName || follower.username || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{follower.displayName || follower.username || "Unknown"}</p>
                  {follower.username && (
                    <p className="text-sm text-muted-foreground truncate">@{follower.username}</p>
                  )}
                </div>
                <FollowButton userId={follower.id} size="sm" />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="following" className="mt-6">
          <div className="space-y-4">
            {following.map((user) => (
              <div key={user.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || ""} />
                  <AvatarFallback>
                    {(user.displayName || user.username || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{user.displayName || user.username || "Unknown"}</p>
                  {user.username && (
                    <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                  )}
                </div>
                <FollowButton userId={user.id} size="sm" />
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

