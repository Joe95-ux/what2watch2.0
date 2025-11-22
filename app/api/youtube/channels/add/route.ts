import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Add a YouTube channel ID to the database
 */
export async function POST(request: NextRequest) {
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
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { channelId, isPrivate = false } = body;

    console.log("[Add Channel ID API] Request received:", { channelId, isPrivate });

    if (!channelId || typeof channelId !== "string") {
      console.error("[Add Channel ID API] Invalid channelId:", channelId);
      return NextResponse.json(
        { error: "channelId is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate channel ID format (should start with UC)
    if (!channelId.match(/^UC[a-zA-Z0-9_-]+$/)) {
      console.error("[Add Channel ID API] Invalid channel ID format:", channelId);
      return NextResponse.json(
        { error: `Invalid channel ID format. Channel IDs should start with 'UC'. Received: ${channelId} (length: ${channelId.length})` },
        { status: 400 }
      );
    }

    // Check if channel ID already exists
    const existing = await db.youTubeChannel.findUnique({
      where: { channelId },
    });

    if (existing) {
      console.log("[Add Channel ID API] Channel ID already exists:", channelId);
      return NextResponse.json(
        { error: "Channel ID already exists in the database", message: "Channel ID is already added. You can mark it as private if you own it." },
        { status: 400 }
      );
    }

    // Get the current max order to append at the end
    const maxOrderChannel = await db.youTubeChannel.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const nextOrder = maxOrderChannel ? maxOrderChannel.order + 1 : 0;

    // Add channel to database
    console.log("[Add Channel ID API] Adding channel to database...");
    const newChannel = await db.youTubeChannel.create({
      data: {
        channelId,
        isActive: true,
        isPrivate: Boolean(isPrivate),
        addedByUserId: isPrivate ? user.id : null,
        order: nextOrder,
      },
    });

    console.log("[Add Channel ID API] Channel added successfully:", newChannel.id);

    return NextResponse.json({
      success: true,
      message: "Channel ID added successfully. The page will refresh to show the new channel.",
      channelId: newChannel.channelId,
    });
  } catch (error) {
    console.error("[Add Channel ID API] Unexpected error:", error);
    if (error instanceof Error) {
      console.error("[Add Channel ID API] Error message:", error.message);
      console.error("[Add Channel ID API] Error stack:", error.stack);
    }
    return NextResponse.json(
      { 
        error: "Failed to add channel ID",
        message: error instanceof Error ? error.message : "Unknown error",
        details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}

