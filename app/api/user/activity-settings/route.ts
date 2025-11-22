import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Get user's activity settings
export async function GET(): Promise<NextResponse<{ settings: unknown } | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: {
        id: true,
        activityVisibility: true,
        showRatingsInActivity: true,
        showReviewsInActivity: true,
        showListsInActivity: true,
        showPlaylistsInActivity: true,
        showWatchedInActivity: true,
        showLikedInActivity: true,
        showFollowedInActivity: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      settings: {
        activityVisibility: user.activityVisibility || "PUBLIC",
        showRatingsInActivity: user.showRatingsInActivity ?? true,
        showReviewsInActivity: user.showReviewsInActivity ?? true,
        showListsInActivity: user.showListsInActivity ?? true,
        showPlaylistsInActivity: user.showPlaylistsInActivity ?? true,
        showWatchedInActivity: user.showWatchedInActivity ?? true,
        showLikedInActivity: user.showLikedInActivity ?? true,
        showFollowedInActivity: user.showFollowedInActivity ?? true,
      },
    });
  } catch (error) {
    console.error("Get activity settings API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity settings" },
      { status: 500 }
    );
  }
}

// POST - Update user's activity settings
export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      activityVisibility,
      showRatingsInActivity,
      showReviewsInActivity,
      showListsInActivity,
      showPlaylistsInActivity,
      showWatchedInActivity,
      showLikedInActivity,
      showFollowedInActivity,
    } = body;

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update user's activity settings
    await db.user.update({
      where: { id: user.id },
      data: {
        ...(activityVisibility && { activityVisibility }),
        ...(showRatingsInActivity !== undefined && { showRatingsInActivity }),
        ...(showReviewsInActivity !== undefined && { showReviewsInActivity }),
        ...(showListsInActivity !== undefined && { showListsInActivity }),
        ...(showPlaylistsInActivity !== undefined && { showPlaylistsInActivity }),
        ...(showWatchedInActivity !== undefined && { showWatchedInActivity }),
        ...(showLikedInActivity !== undefined && { showLikedInActivity }),
        ...(showFollowedInActivity !== undefined && { showFollowedInActivity }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update activity settings API error:", error);
    return NextResponse.json(
      { error: "Failed to update activity settings" },
      { status: 500 }
    );
  }
}

