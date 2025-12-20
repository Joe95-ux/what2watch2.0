import { useQuery } from "@tanstack/react-query";

interface BadgeDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  criteria: {
    minPosts?: number;
    minReplies?: number;
    minUpvotes?: number;
    minReputation?: number;
    minFollowers?: number;
  };
}

interface UserBadge {
  id: string;
  badgeId: string;
  userId: string;
  awardedAt: string;
  badge: BadgeDefinition;
}

interface BadgesResponse {
  badges: BadgeDefinition[];
  userBadges: UserBadge[];
}

/**
 * Hook to fetch forum badges
 */
export function useForumBadges(userId?: string | null) {
  return useQuery<BadgesResponse>({
    queryKey: ["forum-badges", userId],
    queryFn: async () => {
      const url = userId
        ? `/api/forum/badges?userId=${userId}`
        : "/api/forum/badges";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch badges");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

