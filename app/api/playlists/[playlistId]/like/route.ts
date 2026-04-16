import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sendEmail, getEmailTemplate } from "@/lib/email";
import {
  triggerPlaylistAnalyticsUpdated,
  triggerPlaylistUpdated,
  triggerUserNotificationsChanged,
} from "@/lib/pusher/server";
import { publishUserNotification } from "@/lib/pusher/beams-server";

// POST - Like a playlist (auto-saves to user's library)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
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

    const { playlistId } = await params;

    // Check if playlist exists
    const playlist = await db.playlist.findUnique({
      where: { id: playlistId },
      select: { id: true, userId: true },
    });

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }

    // Can't like your own playlist (it's already in your library)
    if (playlist.userId === user.id) {
      return NextResponse.json(
        { error: "Cannot like your own playlist" },
        { status: 400 }
      );
    }

    // Check if already liked
    const existingLike = await db.likedPlaylist.findUnique({
      where: {
        userId_playlistId: {
          userId: user.id,
          playlistId: playlistId,
        },
      },
    });

    if (existingLike) {
      return NextResponse.json(
        { error: "Playlist already liked" },
        { status: 400 }
      );
    }

    // Create liked playlist entry and increment likes count
    await db.$transaction([
      db.likedPlaylist.create({
        data: {
          userId: user.id,
          playlistId: playlistId,
          isReadOnly: true,
        },
      }),
      db.playlist.update({
        where: { id: playlistId },
        data: {
          likesCount: {
            increment: 1,
          },
        },
      }),
    ]);

    await triggerPlaylistUpdated(playlistId, { action: "liked", actorId: user.id });
    await triggerPlaylistAnalyticsUpdated(playlist.userId, { action: "liked", playlistId });

    try {
      const owner = await db.user.findUnique({
        where: { id: playlist.userId },
        select: {
          id: true,
          email: true,
          emailNotifications: true,
          pushNotifications: true,
          notifyOnPlaylistUpdates: true,
          username: true,
          displayName: true,
        },
      });

      if (owner && owner.notifyOnPlaylistUpdates !== false) {
        const likerName = user.displayName || user.username || "Someone";
        await db.generalNotification.create({
          data: {
            userId: owner.id,
            type: "PLAYLIST_LIKED",
            title: "Your playlist was liked",
            message: `${likerName} liked your playlist`,
            linkUrl: `/playlists/${playlistId}?public=true`,
            metadata: { playlistId, likerId: user.id },
          },
        });

        await triggerUserNotificationsChanged([owner.id], "general", {
          source: "playlist-liked",
          playlistId,
        });

        if (owner.pushNotifications !== false) {
          await publishUserNotification({
            userIds: [owner.id],
            title: "Your playlist was liked",
            body: `${likerName} liked your playlist`,
            linkUrl: `/playlists/${playlistId}?public=true`,
            data: { playlistId, likerId: user.id },
          });
        }

        if (owner.emailNotifications && owner.email) {
          const ownerName = owner.username || owner.displayName || "there";
          const emailHtml = getEmailTemplate({
            title: "Your playlist got a new like",
            content: `<p style="margin:0 0 16px;">Hi ${ownerName},</p><p style="margin:0 0 16px;">${likerName} liked one of your playlists.</p>`,
            ctaText: "View Playlist",
            ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/playlists/${playlistId}?public=true`,
            footerText: "You can manage notification preferences from your settings.",
          });
          await sendEmail({
            to: owner.email,
            subject: "Your playlist got a new like",
            html: emailHtml,
          });
        }
      }
    } catch (notificationError) {
      console.error("Failed to create playlist-like notifications:", notificationError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error liking playlist:", error);
    return NextResponse.json(
      { error: "Failed to like playlist" },
      { status: 500 }
    );
  }
}

// DELETE - Unlike a playlist (removes from user's library)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
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

    const { playlistId } = await params;

    // Delete liked playlist entry and decrement likes count
    const deleted = await db.likedPlaylist.deleteMany({
      where: {
        userId: user.id,
        playlistId: playlistId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Playlist not liked" },
        { status: 404 }
      );
    }

    // Decrement likes count
    await db.playlist.update({
      where: { id: playlistId },
      data: {
        likesCount: {
          decrement: 1,
        },
      },
    });

    const playlist = await db.playlist.findUnique({
      where: { id: playlistId },
      select: { userId: true },
    });
    await triggerPlaylistUpdated(playlistId, { action: "unliked", actorId: user.id });
    if (playlist?.userId) {
      await triggerPlaylistAnalyticsUpdated(playlist.userId, { action: "unliked", playlistId });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unliking playlist:", error);
    return NextResponse.json(
      { error: "Failed to unlike playlist" },
      { status: 500 }
    );
  }
}

// GET - Check if current user has liked the playlist
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
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

    const { playlistId } = await params;

    const liked = await db.likedPlaylist.findUnique({
      where: {
        userId_playlistId: {
          userId: user.id,
          playlistId: playlistId,
        },
      },
    });

    return NextResponse.json({ isLiked: !!liked });
  } catch (error) {
    console.error("Error checking like status:", error);
    return NextResponse.json({ isLiked: false });
  }
}

