import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveCurrentUserId } from "../../helpers";
import { getEmailTemplate, sendEmail } from "@/lib/email";
import {
  triggerUserNotificationsChanged,
  triggerYouTubeChannelListUpdated,
  triggerYouTubeListAnalyticsUpdated,
} from "@/lib/pusher/server";
import { publishUserNotification } from "@/lib/pusher/beams-server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { userId: currentUserId } = await resolveCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listId } = await params;
    const list = await db.youTubeChannelList.findUnique({
      where: { id: listId },
      select: { id: true, userId: true },
    });

    if (!list || !list.id) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (list.userId === currentUserId) {
      return NextResponse.json(
        { error: "You cannot follow your own list" },
        { status: 400 }
      );
    }

    const existingFollow = await db.youTubeChannelListFollow.findUnique({
      where: {
        listId_userId: {
          listId,
          userId: currentUserId,
        },
      },
      select: { id: true },
    });

    if (existingFollow) {
      await db.$transaction([
        db.youTubeChannelListFollow.delete({
          where: { id: existingFollow.id },
        }),
        db.youTubeChannelList.update({
          where: { id: listId },
          data: {
            followersCount: {
              decrement: 1,
            },
          },
        }),
      ]);
      await triggerYouTubeChannelListUpdated(listId, {
        action: "unfollowed",
        actorId: currentUserId,
      });
      await triggerYouTubeListAnalyticsUpdated(list.userId, {
        action: "unfollowed",
        listId,
      });
      return NextResponse.json({ isFollowing: false });
    }

    await db.$transaction([
      db.youTubeChannelListFollow.create({
        data: {
          listId,
          userId: currentUserId,
        },
      }),
      db.youTubeChannelList.update({
        where: { id: listId },
        data: {
          followersCount: {
            increment: 1,
          },
        },
      }),
    ]);

    await triggerYouTubeChannelListUpdated(listId, {
      action: "followed",
      actorId: currentUserId,
    });
    await triggerYouTubeListAnalyticsUpdated(list.userId, {
      action: "followed",
      listId,
    });

    try {
      const [owner, follower] = await Promise.all([
        db.user.findUnique({
          where: { id: list.userId },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            emailNotifications: true,
            pushNotifications: true,
            notifyOnListUpdates: true,
          },
        }),
        db.user.findUnique({
          where: { id: currentUserId },
          select: { id: true, username: true, displayName: true },
        }),
      ]);

      if (owner && follower && owner.notifyOnListUpdates !== false) {
        const followerName = follower.displayName || follower.username || "Someone";
        await db.generalNotification.create({
          data: {
            userId: owner.id,
            type: "YOUTUBE_LIST_FOLLOWED",
            title: "Your YouTube list got a new follower",
            message: `${followerName} followed your channel list`,
            linkUrl: `/youtube-channel/lists/${listId}`,
            metadata: { listId, followerId: follower.id },
          },
        });

        await triggerUserNotificationsChanged([owner.id], "general", {
          source: "youtube-list-followed",
          listId,
        });

        if (owner.pushNotifications !== false) {
          await publishUserNotification({
            userIds: [owner.id],
            title: "Your YouTube list got a new follower",
            body: `${followerName} followed your channel list`,
            linkUrl: `/youtube-channel/lists/${listId}`,
            data: { listId, followerId: follower.id },
          });
        }

        if (owner.emailNotifications && owner.email) {
          const ownerName = owner.username || owner.displayName || "there";
          const html = getEmailTemplate({
            title: "Your YouTube list has a new follower",
            content: `<p style="margin:0 0 16px;">Hi ${ownerName},</p><p style="margin:0 0 16px;">${followerName} followed your YouTube channel list.</p>`,
            ctaText: "View List",
            ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/youtube-channel/lists/${listId}`,
            footerText: "You can manage notification preferences from settings.",
          });
          await sendEmail({
            to: owner.email,
            subject: "Your YouTube list has a new follower",
            html,
          });
        }
      }
    } catch (notificationError) {
      console.error("[YouTubeChannelLists] follow notification error", notificationError);
    }

    return NextResponse.json({ isFollowing: true });
  } catch (error) {
    console.error("[YouTubeChannelLists] follow toggle error", error);
    return NextResponse.json(
      { error: "Failed to update follow state" },
      { status: 500 }
    );
  }
}

