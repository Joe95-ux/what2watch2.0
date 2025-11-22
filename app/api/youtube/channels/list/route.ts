import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

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

    // Query all channels first (since some may not have isPrivate field)
    // Then filter in memory to handle missing fields as public (default)
    const allChannels = await db.youTubeChannel.findMany({
      orderBy: {
        order: "asc",
      },
      select: {
        channelId: true,
        isPrivate: true,
        addedByUserId: true,
      },
    });

    // Filter channels: public (isPrivate is false or missing) OR user's private channels
    const channels = allChannels.filter((channel) => {
      // Treat missing/null isPrivate as public (default behavior)
      const isPublic = channel.isPrivate === false || channel.isPrivate === null || channel.isPrivate === undefined;
      
      if (isPublic) {
        return true; // Show all public channels
      }
      
      // If private, only show if user owns it
      if (channel.isPrivate === true && user) {
        return channel.addedByUserId === user.id;
      }
      
      return false;
    });

    const channelIds = channels.map((channel) => channel.channelId);

    console.log("[YouTube Channels API] Fetched channels:", {
      total: channels.length,
      user: user?.id || "anonymous",
      public: channels.filter(c => c.isPrivate === false || c.isPrivate === null || c.isPrivate === undefined).length,
      private: channels.filter(c => c.isPrivate === true).length,
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
