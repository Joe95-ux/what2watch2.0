"use client";

import { useForumBadges } from "@/hooks/use-forum-badges";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award } from "lucide-react";
import { cn } from "@/lib/utils";

export function ForumBadgesContent() {
  const { user } = useUser();
  const { data, isLoading } = useForumBadges();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const badges = data?.badges || [];
  const userBadges = data?.userBadges || [];
  const userBadgeSlugs = new Set(userBadges.map((ub) => ub.badge.slug));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Trophy className="h-6 w-6" />
          Forum Badges
        </h1>
        <p className="text-sm text-muted-foreground">
          Earn badges by participating in the forum community
        </p>
      </div>

      {userBadges.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5" />
            Your Badges ({userBadges.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userBadges.map((userBadge) => (
              <Card key={userBadge.id} className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{userBadge.badge.icon || "🏆"}</span>
                    <span>{userBadge.badge.name}</span>
                  </CardTitle>
                  <CardDescription>{userBadge.badge.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Awarded {new Date(userBadge.awardedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">All Badges</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => {
            const isEarned = userBadgeSlugs.has(badge.slug);
            return (
              <Card
                key={badge.id}
                className={cn(
                  "transition-all",
                  isEarned
                    ? "border-primary/20 bg-primary/5"
                    : "opacity-60"
                )}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{badge.icon || "🏆"}</span>
                    <span>{badge.name}</span>
                    {isEarned && (
                      <Badge variant="default" className="ml-auto">
                        Earned
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{badge.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {badge.criteria.minPosts && (
                      <p>Requires {badge.criteria.minPosts} posts</p>
                    )}
                    {badge.criteria.minReplies && (
                      <p>Requires {badge.criteria.minReplies} replies</p>
                    )}
                    {badge.criteria.minUpvotes && (
                      <p>Requires {badge.criteria.minUpvotes} upvotes</p>
                    )}
                    {badge.criteria.minReputation && (
                      <p>Requires {badge.criteria.minReputation} reputation</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

