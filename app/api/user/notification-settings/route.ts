import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Get user's notification settings
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
        emailNotifications: true,
        pushNotifications: true,
        notifyOnNewFollowers: true,
        notifyOnNewReviews: true,
        notifyOnListUpdates: true,
        notifyOnPlaylistUpdates: true,
        notifyOnActivityLikes: true,
        notifyOnMentions: true,
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
        emailNotifications: user.emailNotifications ?? true,
        pushNotifications: user.pushNotifications ?? true,
        notifyOnNewFollowers: user.notifyOnNewFollowers ?? true,
        notifyOnNewReviews: user.notifyOnNewReviews ?? true,
        notifyOnListUpdates: user.notifyOnListUpdates ?? true,
        notifyOnPlaylistUpdates: user.notifyOnPlaylistUpdates ?? true,
        notifyOnActivityLikes: user.notifyOnActivityLikes ?? true,
        notifyOnMentions: user.notifyOnMentions ?? true,
      },
    });
  } catch (error) {
    console.error("Get notification settings API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification settings" },
      { status: 500 }
    );
  }
}

// POST - Update user's notification settings
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
      emailNotifications,
      pushNotifications,
      notifyOnNewFollowers,
      notifyOnNewReviews,
      notifyOnListUpdates,
      notifyOnPlaylistUpdates,
      notifyOnActivityLikes,
      notifyOnMentions,
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

    // Update user's notification settings
    await db.user.update({
      where: { id: user.id },
      data: {
        ...(emailNotifications !== undefined && { emailNotifications }),
        ...(pushNotifications !== undefined && { pushNotifications }),
        ...(notifyOnNewFollowers !== undefined && { notifyOnNewFollowers }),
        ...(notifyOnNewReviews !== undefined && { notifyOnNewReviews }),
        ...(notifyOnListUpdates !== undefined && { notifyOnListUpdates }),
        ...(notifyOnPlaylistUpdates !== undefined && { notifyOnPlaylistUpdates }),
        ...(notifyOnActivityLikes !== undefined && { notifyOnActivityLikes }),
        ...(notifyOnMentions !== undefined && { notifyOnMentions }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update notification settings API error:", error);
    return NextResponse.json(
      { error: "Failed to update notification settings" },
      { status: 500 }
    );
  }
}

