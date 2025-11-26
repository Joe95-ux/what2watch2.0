"use client";

import { useQuery } from "@tanstack/react-query";

interface LeaderboardReviewer {
  userId: string;
  rank: number;
  reviewCount: number;
  helpfulVotes: number;
  averageRating: number | null;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  badges: Array<{
    slug: string;
    name: string;
    icon: string | null;
  }>;
}

interface BadgeDefinition {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  minReviews: number;
  minHelpfulVotes: number;
}

interface UserBadge {
  id: string;
  badgeId: string;
  badge: BadgeDefinition;
  awardedAt: string;
  reason: string | null;
  reviewCountSnapshot: number;
  helpfulCountSnapshot: number;
}

interface BadgeResponse {
  badges: BadgeDefinition[];
  userBadges: UserBadge[];
  stats: {
    totalReviews: number;
    helpfulVotes: number;
  } | null;
}

export function useReviewLeaderboard() {
  return useQuery<LeaderboardReviewer[]>({
    queryKey: ["youtube-review-leaderboard"],
    queryFn: async () => {
      const response = await fetch("/api/youtube/channel-reviews/leaderboard");
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to load leaderboard" }));
        throw new Error(error.error || "Failed to load leaderboard");
      }
      const data = await response.json();
      return (data.leaderboard || []) as LeaderboardReviewer[];
    },
    staleTime: 1000 * 60 * 15,
  });
}

export function useReviewBadges() {
  return useQuery<BadgeResponse>({
    queryKey: ["youtube-review-badges"],
    queryFn: async () => {
      const response = await fetch("/api/youtube/channel-reviews/badges");
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to load badges" }));
        throw new Error(error.error || "Failed to load review badges");
      }
      return (await response.json()) as BadgeResponse;
    },
    staleTime: 1000 * 60 * 10,
  });
}

