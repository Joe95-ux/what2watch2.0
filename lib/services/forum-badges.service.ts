/**
 * Service for forum user badges and achievements
 * Separated from components for clear concerns
 */

import { db } from "@/lib/db";

export interface BadgeDefinition {
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

export interface UserBadge {
  id: string;
  badgeId: string;
  userId: string;
  awardedAt: Date;
  badge: BadgeDefinition;
}

// Default badge definitions
const DEFAULT_BADGES: Omit<BadgeDefinition, "id">[] = [
  {
    slug: "first-post",
    name: "First Post",
    description: "Created your first forum post",
    icon: "🎉",
    criteria: { minPosts: 1 },
  },
  {
    slug: "contributor",
    name: "Contributor",
    description: "Created 10 forum posts",
    icon: "📝",
    criteria: { minPosts: 10 },
  },
  {
    slug: "active-member",
    name: "Active Member",
    description: "Created 50 forum posts",
    icon: "⭐",
    criteria: { minPosts: 50 },
  },
  {
    slug: "discussion-starter",
    name: "Discussion Starter",
    description: "Created 100 forum posts",
    icon: "🔥",
    criteria: { minPosts: 100 },
  },
  {
    slug: "first-reply",
    name: "First Reply",
    description: "Posted your first reply",
    icon: "💬",
    criteria: { minReplies: 1 },
  },
  {
    slug: "helpful",
    name: "Helpful",
    description: "Received 10 upvotes on your posts",
    icon: "👍",
    criteria: { minUpvotes: 10 },
  },
  {
    slug: "popular",
    name: "Popular",
    description: "Received 100 upvotes on your posts",
    icon: "🌟",
    criteria: { minUpvotes: 100 },
  },
  {
    slug: "influencer",
    name: "Influencer",
    description: "Received 1000 upvotes on your posts",
    icon: "👑",
    criteria: { minUpvotes: 1000 },
  },
  {
    slug: "rising-star",
    name: "Rising Star",
    description: "Reached 50 reputation points",
    icon: "⭐",
    criteria: { minReputation: 50 },
  },
  {
    slug: "community-leader",
    name: "Community Leader",
    description: "Reached 500 reputation points",
    icon: "🏆",
    criteria: { minReputation: 500 },
  },
];

/**
 * Ensure badges are seeded in the database
 * This function is idempotent and safe to call multiple times
 */
async function ensureBadgesAreSeeded() {
  try {
    // Check if badges already exist
    const existingBadges = await db.forumBadge.findMany({
      select: { slug: true },
    });
    
    const existingSlugs = new Set(existingBadges.map(b => b.slug));
    
    // Only create badges that don't exist
    const badgesToCreate = DEFAULT_BADGES.filter(badge => !existingSlugs.has(badge.slug));
    
    if (badgesToCreate.length > 0) {
      await Promise.all(
        badgesToCreate.map(async (badge) => {
          await db.forumBadge.create({
            data: {
              slug: badge.slug,
              name: badge.name,
              description: badge.description,
              icon: badge.icon,
              criteria: badge.criteria,
            },
          });
        })
      );
      console.log(`Created ${badgesToCreate.length} forum badges`);
    }
  } catch (error) {
    console.error("Error seeding forum badges:", error);
    // Don't throw - allow the function to continue even if seeding fails
  }
}

/**
 * Evaluate and award badges to a user
 */
export async function evaluateUserBadges(userId: string): Promise<UserBadge[]> {
  if (!userId) return [];

  await ensureBadgesAreSeeded();

  // Get user stats
  const [userStats, existingBadges, postsWithReactions] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        _count: {
          select: {
            forumPosts: {
              where: { isHidden: false },
            },
            forumReplies: {
              where: { isHidden: false },
            },
          },
        },
      },
    }),
    db.userForumBadge.findMany({
      where: { userId },
      include: { badge: true },
    }),
    db.forumPost.findMany({
      where: {
        userId,
        isHidden: false,
      },
      select: {
        reactions: {
          select: {
            reactionType: true,
          },
        },
      },
    }),
  ]);

  if (!userStats) return [];

  const postCount = userStats._count.forumPosts ?? 0;
  const replyCount = userStats._count.forumReplies ?? 0;

  // Calculate total upvotes
  let totalUpvotes = 0;
  postsWithReactions.forEach((post) => {
    post.reactions.forEach((reaction) => {
      if (reaction.reactionType === "upvote") {
        totalUpvotes++;
      }
    });
  });

  // Get reputation (simplified - can be enhanced)
  const reputation = totalUpvotes * 2; // 2 points per upvote

  // Get all badge definitions
  const allBadges = await db.forumBadge.findMany();

  const ownedBadgeSlugs = new Set(existingBadges.map((entry) => entry.badge.slug));

  // Find newly earned badges
  const newlyEarned = allBadges.filter((badge) => {
    if (ownedBadgeSlugs.has(badge.slug)) return false;

    const criteria = badge.criteria as BadgeDefinition["criteria"];
    if (criteria.minPosts && postCount < criteria.minPosts) return false;
    if (criteria.minReplies && replyCount < criteria.minReplies) return false;
    if (criteria.minUpvotes && totalUpvotes < criteria.minUpvotes) return false;
    if (criteria.minReputation && reputation < criteria.minReputation) return false;

    return true;
  });

  // Award new badges
  if (newlyEarned.length > 0) {
    await db.userForumBadge.createMany({
      data: newlyEarned.map((badge) => ({
        badgeId: badge.id,
        userId,
      })),
      skipDuplicates: true,
    });
  }

  // Return all user badges
  const userBadges = await db.userForumBadge.findMany({
    where: { userId },
    include: { badge: true },
    orderBy: { awardedAt: "desc" },
  });

  return userBadges.map((ub) => ({
    id: ub.id,
    badgeId: ub.badgeId,
    userId: ub.userId,
    awardedAt: ub.awardedAt,
    badge: {
      id: ub.badge.id,
      slug: ub.badge.slug,
      name: ub.badge.name,
      description: ub.badge.description,
      icon: ub.badge.icon,
      criteria: ub.badge.criteria as BadgeDefinition["criteria"],
    },
  }));
}

/**
 * Get all badge definitions
 */
export async function getAllBadgeDefinitions(): Promise<BadgeDefinition[]> {
  await ensureBadgesAreSeeded();

  const badges = await db.forumBadge.findMany({
    orderBy: { name: "asc" },
  });

  return badges.map((badge) => ({
    id: badge.id,
    slug: badge.slug,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    criteria: badge.criteria as BadgeDefinition["criteria"],
  }));
}

