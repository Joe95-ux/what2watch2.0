import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * POST /api/youtube/channels/pool
 * Add or remove a channel from user's personal channel pool
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { channelId, action } = body; // action: "add" | "remove"

    if (!channelId || !action) {
      return NextResponse.json(
        { error: "channelId and action are required" },
        { status: 400 }
      );
    }

    if (action !== "add" && action !== "remove") {
      return NextResponse.json(
        { error: "action must be 'add' or 'remove'" },
        { status: 400 }
      );
    }

    // Get current user
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

    if (action === "add") {
      // Check if channel exists in app pool
      const channel = await db.youTubeChannel.findUnique({
        where: { channelId },
        select: { id: true, channelId: true, title: true, thumbnail: true, channelUrl: true, slug: true },
      });

      if (!channel) {
        return NextResponse.json(
          { error: "Channel not found in app pool" },
          { status: 404 }
        );
      }

      // Check if already in user's pool
      const existing = await db.favoriteChannel.findUnique({
        where: {
          userId_channelId: {
            userId: user.id,
            channelId,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { message: "Channel already in your feed", inPool: true },
          { status: 200 }
        );
      }

      // Add to user's pool (FavoriteChannel represents user's channel pool)
      const favoriteChannel = await db.favoriteChannel.create({
        data: {
          userId: user.id,
          channelId: channel.channelId,
          slug: channel.slug,
          title: channel.title,
          thumbnail: channel.thumbnail,
          channelUrl: channel.channelUrl,
        },
      });

      return NextResponse.json({
        message: "Channel added to your feed",
        inPool: true,
        channel: favoriteChannel,
      });
    } else {
      // Remove from user's pool
      const existing = await db.favoriteChannel.findUnique({
        where: {
          userId_channelId: {
            userId: user.id,
            channelId,
          },
        },
      });

      if (!existing) {
        return NextResponse.json(
          { message: "Channel not in your feed", inPool: false },
          { status: 200 }
        );
      }

      await db.favoriteChannel.delete({
        where: {
          userId_channelId: {
            userId: user.id,
            channelId,
          },
        },
      });

      return NextResponse.json({
        message: "Channel removed from your feed",
        inPool: false,
      });
    }
  } catch (error) {
    console.error("[ChannelPool] POST error", error);
    return NextResponse.json(
      { error: "Failed to update channel pool" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/youtube/channels/pool
 * Get all channels in user's personal channel pool
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get current user
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

    // Get all channels in user's pool
    const userChannels = await db.favoriteChannel.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      channels: userChannels,
      count: userChannels.length,
    });
  } catch (error) {
    console.error("[ChannelPool] GET error", error);
    return NextResponse.json(
      { error: "Failed to fetch channel pool" },
      { status: 500 }
    );
  }
}

