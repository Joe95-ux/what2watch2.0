import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Check if current user has liked this activity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const { activityId } = await params;
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ liked: false });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ liked: false });
    }

    const like = await db.activityLike.findUnique({
      where: {
        activityId_userId: {
          activityId,
          userId: user.id,
        },
      },
    });

    return NextResponse.json({ liked: !!like });
  } catch (error) {
    console.error("Error checking activity like:", error);
    return NextResponse.json({ liked: false });
  }
}

// POST - Like an activity
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const { activityId } = await params;
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, username: true, displayName: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const activity = await db.activity.findUnique({
      where: { id: activityId },
      select: { id: true, userId: true },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    // Can't like your own activity (optional - remove if you want to allow)
    if (activity.userId === user.id) {
      return NextResponse.json(
        { error: "Cannot like your own activity" },
        { status: 400 }
      );
    }

    const existing = await db.activityLike.findUnique({
      where: {
        activityId_userId: {
          activityId,
          userId: user.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, liked: true });
    }

    await db.activityLike.create({
      data: {
        activityId,
        userId: user.id,
      },
    });

    // Notify activity owner if they have activity-like notifications enabled
    try {
      const owner = await db.user.findUnique({
        where: { id: activity.userId },
        select: { notifyOnActivityLikes: true },
      });
      if (owner?.notifyOnActivityLikes !== false) {
        const likerName = user.displayName || user.username || "Someone";
        await db.generalNotification.create({
          data: {
            userId: activity.userId,
            type: "ACTIVITY_LIKED",
            title: "Activity liked",
            message: `${likerName} liked your activity`,
            linkUrl: `/dashboard/activity?highlight=${activityId}`,
            metadata: { activityId, likerId: user.id },
          },
        });
      }
    } catch (err) {
      console.error("Failed to create activity-liked notification:", err);
    }

    return NextResponse.json({ success: true, liked: true });
  } catch (error) {
    console.error("Error liking activity:", error);
    return NextResponse.json(
      { error: "Failed to like activity" },
      { status: 500 }
    );
  }
}

// DELETE - Unlike an activity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const { activityId } = await params;
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const deleted = await db.activityLike.deleteMany({
      where: {
        activityId,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      liked: false,
      removed: deleted.count > 0,
    });
  } catch (error) {
    console.error("Error unliking activity:", error);
    return NextResponse.json(
      { error: "Failed to unlike activity" },
      { status: 500 }
    );
  }
}
