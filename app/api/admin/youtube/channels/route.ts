import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

/**
 * GET - Get all YouTube channels for admin management
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const allChannels = await db.youTubeChannel.findMany({
      orderBy: [
        { isActive: "desc" },
        { isNollywood: "desc" },
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
        isNollywood: true,
        addedByUserId: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      channels: allChannels,
      total: allChannels.length,
    });
  } catch (error) {
    console.error("[Admin YouTube Channels API] Error:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { 
        error: "Failed to fetch channels",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

