import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    let user = null;
    if (userId) {
      user = await db.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
      });
    }

    // Build OR conditions: public channels OR user's private channels
    const orConditions: Prisma.YouTubeChannelWhereInput[] = [
      { isPrivate: false }, // All public channels
    ];

    // If user is authenticated, add condition for their private channels
    if (user) {
      orConditions.push({
        isPrivate: true,
        addedByUserId: user.id, // user.id is a string (ObjectId), which matches addedByUserId type
      });
    }

    // Simple query: public channels OR user's private channels
    const channels = await db.youTubeChannel.findMany({
      where: {
        OR: orConditions,
      },
      orderBy: {
        order: "asc",
      },
      select: {
        channelId: true,
        isPrivate: true,
        addedByUserId: true,
      },
    });

    const channelIds = channels.map((channel) => channel.channelId);

    // Debug: Check all channels to see their privacy status
    const allChannelsDebug = await db.youTubeChannel.findMany({
      select: {
        channelId: true,
        isPrivate: true,
        addedByUserId: true,
      },
    });

    console.log("[YouTube Channels API] Debug info:", {
      totalInDB: allChannelsDebug.length,
      publicChannels: allChannelsDebug.filter(c => !c.isPrivate).length,
      privateChannels: allChannelsDebug.filter(c => c.isPrivate).length,
      privateWithOwner: allChannelsDebug.filter(c => c.isPrivate && c.addedByUserId).length,
      privateWithoutOwner: allChannelsDebug.filter(c => c.isPrivate && !c.addedByUserId).length,
      currentUserId: user?.id || "anonymous",
      currentUserIdType: typeof user?.id,
      fetchedChannels: channels.length,
      fetchedPublic: channels.filter(c => !c.isPrivate).length,
      fetchedPrivate: channels.filter(c => c.isPrivate).length,
      samplePrivateChannels: allChannelsDebug
        .filter(c => c.isPrivate)
        .slice(0, 3)
        .map(c => ({
          channelId: c.channelId,
          addedByUserId: c.addedByUserId,
          addedByUserIdType: typeof c.addedByUserId,
          matchesCurrentUser: c.addedByUserId === user?.id,
        })),
    });

    return NextResponse.json({ channelIds });
  } catch (error) {
    console.error("[YouTube Channels API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch channel IDs", channelIds: [] },
      { status: 500 }
    );
  }
}