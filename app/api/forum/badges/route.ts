import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { evaluateUserBadges, getAllBadgeDefinitions } from "@/lib/services/forum-badges.service";

/**
 * GET - Get all badge definitions and user badges (if authenticated)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId"); // Optional: get badges for specific user

    const badges = await getAllBadgeDefinitions();

    if (!clerkUserId && !userId) {
      return NextResponse.json({ badges, userBadges: [] });
    }

    // Get user ID
    let targetUserId: string | null = null;
    if (userId) {
      // If userId param provided, use that (for viewing other users' badges)
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      targetUserId = user?.id || null;
    } else if (clerkUserId) {
      // Otherwise use current user
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });
      targetUserId = user?.id || null;
    }

    if (!targetUserId) {
      return NextResponse.json({ badges, userBadges: [] });
    }

    // Evaluate and award new badges
    await evaluateUserBadges(targetUserId);

    // Get user badges
    const userBadges = await db.userForumBadge.findMany({
      where: { userId: targetUserId },
      include: { badge: true },
      orderBy: { awardedAt: "desc" },
    });

    return NextResponse.json({
      badges,
      userBadges: userBadges.map((ub) => ({
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
          criteria: ub.badge.criteria as {
            minPosts?: number;
            minReplies?: number;
            minUpvotes?: number;
            minReputation?: number;
            minFollowers?: number;
          },
        },
      })),
    });
  } catch (error) {
    console.error("Error fetching badges:", error);
    return NextResponse.json(
      { error: "Failed to fetch badges" },
      { status: 500 }
    );
  }
}

