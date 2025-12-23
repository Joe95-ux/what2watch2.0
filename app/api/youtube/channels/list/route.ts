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

    const searchParams = request.nextUrl.searchParams;
    const nollywoodOnly = searchParams.get("nollywood") === "true";

    // Query all channels first (since some may not have isPrivate field)
    // Then filter in memory to handle missing fields as public (default)
    const allChannels = await db.youTubeChannel.findMany({
      where: nollywoodOnly ? { isNollywood: true } : undefined,
      orderBy: {
        order: "asc",
      },
      select: {
        channelId: true,
        isPrivate: true,
        isActive: true,
        isNollywood: true,
        addedByUserId: true,
      },
    });

    // Filter channels: 
    // 1. Must be active (isActive is true or missing/null - default to true)
    // 2. Must be public (isPrivate is false or missing) OR user's private channels
    const channels = allChannels.filter((channel) => {
      // First check if channel is active (treat missing/null as active)
      const isActive = channel.isActive === true || channel.isActive === null || channel.isActive === undefined;
      if (!isActive) {
        return false; // Don't show inactive channels
      }

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
