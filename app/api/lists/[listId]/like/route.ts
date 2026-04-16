import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sendEmail, getEmailTemplate } from "@/lib/email";
import {
  triggerListAnalyticsUpdated,
  triggerListUpdated,
  triggerUserNotificationsChanged,
} from "@/lib/pusher/server";
import { publishUserNotification } from "@/lib/pusher/beams-server";

// POST - Like a list (PUBLIC or FOLLOWERS_ONLY only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
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

    const { listId } = await params;

    // Check if list exists and is PUBLIC or FOLLOWERS_ONLY
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { id: true, userId: true, visibility: true },
    });

    if (!list) {
      return NextResponse.json(
        { error: "List not found" },
        { status: 404 }
      );
    }

    // Can't like your own list
    if (list.userId === user.id) {
      return NextResponse.json(
        { error: "Cannot like your own list" },
        { status: 400 }
      );
    }

    // Can only like PUBLIC or FOLLOWERS_ONLY lists
    if (list.visibility === "PRIVATE") {
      return NextResponse.json(
        { error: "Cannot like private lists" },
        { status: 403 }
      );
    }

    // If FOLLOWERS_ONLY, check if user is following the list owner
    if (list.visibility === "FOLLOWERS_ONLY") {
      const isFollowing = await db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: user.id,
            followingId: list.userId,
          },
        },
      });

      if (!isFollowing) {
        return NextResponse.json(
          { error: "Cannot like lists from users you don't follow" },
          { status: 403 }
        );
      }
    }

    // Check if already liked
    const existingLike = await db.likedList.findUnique({
      where: {
        userId_listId: {
          userId: user.id,
          listId: listId,
        },
      },
    });

    if (existingLike) {
      return NextResponse.json(
        { error: "List already liked" },
        { status: 400 }
      );
    }

    // Create liked list entry
    await db.likedList.create({
      data: {
        userId: user.id,
        listId: listId,
      },
    });

    await triggerListUpdated(listId, { action: "liked", actorId: user.id });
    await triggerListAnalyticsUpdated(list.userId, { action: "liked", listId });

    try {
      const owner = await db.user.findUnique({
        where: { id: list.userId },
        select: {
          id: true,
          email: true,
          emailNotifications: true,
          pushNotifications: true,
          notifyOnListUpdates: true,
          username: true,
          displayName: true,
        },
      });

      if (owner && owner.notifyOnListUpdates !== false) {
        const likerName = user.displayName || user.username || "Someone";

        await db.generalNotification.create({
          data: {
            userId: owner.id,
            type: "LIST_LIKED",
            title: "Your list was liked",
            message: `${likerName} liked your list`,
            linkUrl: `/lists/${listId}`,
            metadata: { listId, likerId: user.id },
          },
        });

        await triggerUserNotificationsChanged([owner.id], "general", {
          source: "list-liked",
          listId,
        });

        if (owner.pushNotifications !== false) {
          await publishUserNotification({
            userIds: [owner.id],
            title: "Your list was liked",
            body: `${likerName} liked your list`,
            linkUrl: `/lists/${listId}`,
            data: { listId, likerId: user.id },
          });
        }

        if (owner.emailNotifications && owner.email) {
          const ownerName = owner.username || owner.displayName || "there";
          const emailHtml = getEmailTemplate({
            title: "Your list got a new like",
            content: `<p style="margin:0 0 16px;">Hi ${ownerName},</p><p style="margin:0 0 16px;">${likerName} liked one of your lists.</p>`,
            ctaText: "View List",
            ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/lists/${listId}`,
            footerText: "You can manage notification preferences from your settings.",
          });
          await sendEmail({
            to: owner.email,
            subject: "Your list got a new like",
            html: emailHtml,
          });
        }
      }
    } catch (notificationError) {
      console.error("Failed to create list-like notifications:", notificationError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error liking list:", error);
    return NextResponse.json(
      { error: "Failed to like list" },
      { status: 500 }
    );
  }
}

// DELETE - Unlike a list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
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

    const { listId } = await params;

    // Delete liked list entry
    const deleted = await db.likedList.deleteMany({
      where: {
        userId: user.id,
        listId: listId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "List not liked" },
        { status: 404 }
      );
    }

    const list = await db.list.findUnique({
      where: { id: listId },
      select: { userId: true },
    });

    await triggerListUpdated(listId, { action: "unliked", actorId: user.id });
    if (list?.userId) {
      await triggerListAnalyticsUpdated(list.userId, { action: "unliked", listId });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unliking list:", error);
    return NextResponse.json(
      { error: "Failed to unlike list" },
      { status: 500 }
    );
  }
}

// GET - Check if current user has liked the list
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ isLiked: false });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ isLiked: false });
    }

    const { listId } = await params;

    const liked = await db.likedList.findUnique({
      where: {
        userId_listId: {
          userId: user.id,
          listId: listId,
        },
      },
    });

    return NextResponse.json({ isLiked: !!liked });
  } catch (error) {
    console.error("Error checking like status:", error);
    return NextResponse.json({ isLiked: false });
  }
}

