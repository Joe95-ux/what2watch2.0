import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const limitParam = Number(request.nextUrl.searchParams.get("limit") || 20);
    const limit = Math.max(1, Math.min(limitParam, 50));

    const leaderboard = await db.channelReview.groupBy({
      by: ["userId"],
      _count: { id: true },
      _sum: { helpfulCount: true },
      _avg: { rating: true },
      orderBy: [
        { _count: { id: "desc" } },
        { _sum: { helpfulCount: "desc" } },
      ],
      take: limit,
    });

    if (leaderboard.length === 0) {
      return NextResponse.json({ leaderboard: [] });
    }

    const userIds = leaderboard.map((entry) => entry.userId);

    const [users, badges] = await Promise.all([
      db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      }),
      db.userYouTubeBadge.findMany({
        where: { userId: { in: userIds } },
        include: { badge: true },
      }),
    ]);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const badgesByUser = badges.reduce<Record<string, { slug: string; name: string; icon: string | null }[]>>(
      (acc, entry) => {
        if (!acc[entry.userId]) acc[entry.userId] = [];
        acc[entry.userId].push({
          slug: entry.badge.slug,
          name: entry.badge.name,
          icon: entry.badge.icon ?? null,
        });
        return acc;
      },
      {}
    );

    const payload = leaderboard.map((entry, index) => ({
      userId: entry.userId,
      rank: index + 1,
      reviewCount: entry._count.id,
      helpfulVotes: entry._sum.helpfulCount ?? 0,
      averageRating: entry._avg.rating ?? null,
      user: userMap.get(entry.userId),
      badges: badgesByUser[entry.userId] ?? [],
    }));

    return NextResponse.json({ leaderboard: payload });
  } catch (error) {
    console.error("[ChannelReviewLeaderboard] error", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}

