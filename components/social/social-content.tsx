"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFollowing, useFollowers } from "@/hooks/use-follow";
import { UserCard } from "./user-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck } from "lucide-react";

export default function SocialContent() {
  const [activeTab, setActiveTab] = useState<"following" | "followers">("following");
  const { data: followingData, isLoading: isLoadingFollowing } = useFollowing();
  const { data: followersData, isLoading: isLoadingFollowers } = useFollowers();

  const following = followingData?.following || [];
  const followers = followersData?.followers || [];

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Social</h1>
        <p className="text-muted-foreground mt-2">
          Manage who you follow and see who follows you
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "following" | "followers")}>
        <TabsList>
          <TabsTrigger value="following" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Following ({following.length})
          </TabsTrigger>
          <TabsTrigger value="followers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Followers ({followers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="following" className="mt-6">
          {isLoadingFollowing ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              ))}
            </div>
          ) : following.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Not following anyone yet</h3>
              <p className="text-muted-foreground">
                Start following users to see their playlists and activity
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {following.map((user) => (
                <UserCard key={user.id} user={user} showFollowedAt />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="followers" className="mt-6">
          {isLoadingFollowers ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              ))}
            </div>
          ) : followers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No followers yet</h3>
              <p className="text-muted-foreground">
                Share your playlists to get followers
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {followers.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

