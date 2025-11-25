import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Get all YouTube channels for management (including inactive and private)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the user from database
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Query all channels first (since some may not have isPrivate field)
    // Then filter in memory to handle missing fields as public (default)
    const allChannels = await db.youTubeChannel.findMany({
      orderBy: [
        { isActive: "desc" },
        { order: "asc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        channelId: true,
        slug: true,
        title: true,
        thumbnail: true,
        channelUrl: true,
        isActive: true,
        isPrivate: true,
        addedByUserId: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Filter channels based on privacy (same logic as browse page):
    // Show public channels (isPrivate is false or missing) OR user's private channels
    // Note: For management page, we show both active and inactive channels
    const channels = allChannels.filter((channel) => {
      // Treat missing/null isPrivate as public (default behavior)
      const isPublic = channel.isPrivate === false || channel.isPrivate === null || channel.isPrivate === undefined;
      
      if (isPublic) {
        return true; // Show all public channels
      }
      
      // If private, only show if user owns it
      if (channel.isPrivate === true) {
        return channel.addedByUserId === user.id;
      }
      
      return false;
    });

    const channelsWithPermissions = channels.map((channel) => ({
      ...channel,
      canManage: channel.addedByUserId === user.id,
    }));

    return NextResponse.json({
      channels: channelsWithPermissions,
      total: channelsWithPermissions.length,
    });
  } catch (error) {
    console.error("[Get Channels for Management API] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch channels",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

