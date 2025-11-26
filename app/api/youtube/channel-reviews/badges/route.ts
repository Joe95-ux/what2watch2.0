import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { evaluateReviewerBadges, getAllBadgeDefinitions } from "@/lib/youtube-review-badges";

export async function GET(_request: NextRequest) {
  try {
    const badges = await getAllBadgeDefinitions();
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ badges, userBadges: [], stats: null });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ badges, userBadges: [], stats: null });
    }

    await evaluateReviewerBadges(user.id);

    const [userBadges, stats] = await Promise.all([
      db.userYouTubeBadge.findMany({
        where: { userId: user.id },
        include: { badge: true },
        orderBy: { awardedAt: "desc" },
      }),
      db.channelReview.aggregate({
        where: { userId: user.id },
        _count: { _all: true },
        _sum: { helpfulCount: true },
      }),
    ]);

    return NextResponse.json({
      badges,
      userBadges,
      stats: {
        totalReviews: stats._count?._all ?? 0,
        helpfulVotes: stats._sum?.helpfulCount ?? 0,
      },
    });
  } catch (error) {
    console.error("[ChannelReviewBadges] error", error);
    return NextResponse.json(
      { error: "Failed to load badges" },
      { status: 500 }
    );
  }
}

