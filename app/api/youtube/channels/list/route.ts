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

    // Simple query: public channels OR user's private channels
    const channels = await db.youTubeChannel.findMany({
      where: {
        OR: [
          { isPrivate: false }, // All public channels
          ...(user ? [{ isPrivate: true, addedByUserId: user.id }] : []) // User's private channels if logged in
        ]
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

    console.log("[YouTube Channels API] Fetched channels:", {
      total: channels.length,
      user: user?.id || "anonymous",
      public: channels.filter(c => !c.isPrivate).length,
      private: channels.filter(c => c.isPrivate).length,
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