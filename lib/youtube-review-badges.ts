import { db } from "@/lib/db";

interface BadgeDefinition {
  slug: string;
  name: string;
  description: string;
  icon: string;
  minReviews: number;
  minHelpfulVotes: number;
}

const DEFAULT_BADGES: BadgeDefinition[] = [
  {
    slug: "rookie-reviewer",
    name: "Rookie Reviewer",
    description: "Published your first YouTube channel review.",
    icon: "🌱",
    minReviews: 1,
    minHelpfulVotes: 0,
  },
  {
    slug: "channel-critic",
    name: "Channel Critic",
    description: "Shared 5 channel reviews.",
    icon: "🎬",
    minReviews: 5,
    minHelpfulVotes: 0,
  },
  {
    slug: "audience-favorite",
    name: "Audience Favorite",
    description: "Earned 10 helpful votes across reviews.",
    icon: "🔥",
    minReviews: 0,
    minHelpfulVotes: 10,
  },
  {
    slug: "trusted-voice",
    name: "Trusted Voice",
    description: "10 reviews and 25 helpful votes.",
    icon: "💎",
    minReviews: 10,
    minHelpfulVotes: 25,
  },
];

let badgesSynced = false;

async function ensureBadgesAreSeeded() {
  if (badgesSynced) return;

  await Promise.all(
    DEFAULT_BADGES.map((badge) =>
      db.youTubeBadge.upsert({
        where: { slug: badge.slug },
        update: {
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          minReviews: badge.minReviews,
          minHelpfulVotes: badge.minHelpfulVotes,
        },
        create: {
          slug: badge.slug,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          minReviews: badge.minReviews,
          minHelpfulVotes: badge.minHelpfulVotes,
        },
      })
    )
  );

  badgesSynced = true;
}

export async function evaluateReviewerBadges(userId: string) {
  if (!userId) return;
  await ensureBadgesAreSeeded();

  const [stats, existingBadges] = await Promise.all([
    db.channelReview.aggregate({
      where: { userId },
      _count: { _all: true },
      _sum: { helpfulCount: true },
    }),
    db.userYouTubeBadge.findMany({
      where: { userId },
      include: { badge: true },
    }),
  ]);

  const totalReviews = stats._count?._all ?? 0;
  const helpfulVotes = stats._sum?.helpfulCount ?? 0;
  const ownedBadgeSlugs = new Set(existingBadges.map((entry) => entry.badge.slug));

  const newlyEarned = DEFAULT_BADGES.filter((badge) => {
    if (ownedBadgeSlugs.has(badge.slug)) return false;
    if (totalReviews < badge.minReviews) return false;
    if (helpfulVotes < badge.minHelpfulVotes) return false;
    return true;
  });

  if (!newlyEarned.length) return;

  const badgeRecords = await db.youTubeBadge.findMany({
    where: { slug: { in: newlyEarned.map((badge) => badge.slug) } },
  });

  const badgeMap = new Map(badgeRecords.map((badge) => [badge.slug, badge]));

  const badgeTransactions = newlyEarned
    .map((badge) => {
      const badgeRecord = badgeMap.get(badge.slug);
      if (!badgeRecord) return null;
      return db.userYouTubeBadge.create({
        data: {
          badgeId: badgeRecord.id,
          userId,
          reason: badge.description,
          reviewCountSnapshot: totalReviews,
          helpfulCountSnapshot: helpfulVotes,
        },
      });
    })
    .filter((entry): entry is ReturnType<typeof db.userYouTubeBadge.create> => Boolean(entry));

  if (badgeTransactions.length) {
    await db.$transaction(badgeTransactions);
  }
}

export async function getAllBadgeDefinitions() {
  await ensureBadgesAreSeeded();
  return db.youTubeBadge.findMany({
    orderBy: { minReviews: "asc" },
  });
}

