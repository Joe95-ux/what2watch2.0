import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ channelId: string }>;
}

/**
 * PATCH - Toggle isNollywood flag for a channel
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await requireAdmin();

    const { channelId } = await params;
    const body = await request.json();
    const { isNollywood } = body;

    if (typeof isNollywood !== "boolean") {
      return NextResponse.json(
        { error: "isNollywood must be a boolean" },
        { status: 400 }
      );
    }

    const channel = await db.youTubeChannel.findUnique({
      where: { channelId },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    const updated = await db.youTubeChannel.update({
      where: { channelId },
      data: { isNollywood },
    });

    return NextResponse.json({
      success: true,
      channel: updated,
    });
  } catch (error) {
    console.error("[Admin Toggle Nollywood API] Error:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { 
        error: "Failed to update channel",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

