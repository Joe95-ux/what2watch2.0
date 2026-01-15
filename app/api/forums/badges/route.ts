import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getAllBadgeDefinitions } from "@/lib/services/forum-badges.service";

/**
 * GET - Get all badge definitions and user badges (if authenticated)
 */
export async function GET(request: NextRequest) {
  try {
    // Get all badge definitions (this will seed them if needed)
    const badges = await getAllBadgeDefinitions();

    // Get user ID if authenticated
    const { userId: clerkUserId } = await auth();
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");

    let targetUserId: string | null = null;

    if (userIdParam) {
      // Viewing specific user's badges
      const user = await db.user.findUnique({
        where: { id: userIdParam },
        select: { id: true },
      });
      targetUserId = user?.id || null;
    } else if (clerkUserId) {
      // Current user's badges
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });
      targetUserId = user?.id || null;
    }

    // Get user badges if we have a target user
    let userBadges: any[] = [];
    if (targetUserId) {
      const userBadgeRecords = await db.userForumBadge.findMany({
        where: { userId: targetUserId },
        include: { badge: true },
        orderBy: { awardedAt: "desc" },
      });

      userBadges = userBadgeRecords.map((ub) => ({
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
          criteria: ub.badge.criteria,
        },
      }));
    }

    return NextResponse.json({
      badges,
      userBadges,
    });
  } catch (error) {
    console.error("Error fetching badges:", error);
    return NextResponse.json(
      { error: "Failed to fetch badges" },
      { status: 500 }
    );
  }
}

