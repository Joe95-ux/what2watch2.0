import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateUniqueChannelSlug } from "@/lib/channel-slug";

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
    const { channelId, addToUserPool = false } = body;

    console.log("[Add Channel ID API] Request received:", { channelId, addToUserPool });

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

    // Fetch channel details from YouTube API
    let channelTitle: string | null = null;
    let channelThumbnail: string | null = null;
    let channelUrl: string | null = null;
    let channelSlug: string | null = null;

    try {
      const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
      if (YOUTUBE_API_KEY) {
        const youtubeResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?id=${channelId}&part=snippet&key=${YOUTUBE_API_KEY}`,
          {
            next: { revalidate: 3600 },
          }
        );

        if (youtubeResponse.ok) {
          const youtubeData = await youtubeResponse.json();
          if (youtubeData.items && youtubeData.items.length > 0) {
            const item = youtubeData.items[0];
            channelTitle = item.snippet?.title || null;
            channelThumbnail = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || null;
            const customUrl = item.snippet?.customUrl;
            channelUrl = customUrl 
              ? `https://www.youtube.com/${customUrl}`
              : `https://www.youtube.com/channel/${channelId}`;
            if (customUrl) {
              channelSlug = await generateUniqueChannelSlug(customUrl);
            }
          }
        }
      }
    } catch (error) {
      console.error("[Add Channel ID API] Error fetching channel details from YouTube:", error);
      // Continue without channel details - they can be fetched later
    }

    // Add channel to app pool (always)
    console.log("[Add Channel ID API] Adding channel to app pool...");
    const newChannel = await db.youTubeChannel.create({
      data: {
        channelId,
        slug: channelSlug ?? (await generateUniqueChannelSlug(channelTitle || channelId)),
        title: channelTitle,
        thumbnail: channelThumbnail,
        channelUrl: channelUrl,
        isActive: true,
        isPrivate: false, // All channels in app pool are public
        addedByUserId: user.id,
        order: nextOrder,
      },
    });

    console.log("[Add Channel ID API] Channel added to app pool successfully:", newChannel.id);

    // If user wants to add to their personal pool, add it
    if (addToUserPool) {
      try {
        // Check if already in user's pool
        const existingInPool = await db.favoriteChannel.findUnique({
          where: {
            userId_channelId: {
              userId: user.id,
              channelId,
            },
          },
        });

        if (!existingInPool) {
          await db.favoriteChannel.create({
            data: {
              userId: user.id,
              channelId: newChannel.channelId,
              slug: newChannel.slug,
              title: newChannel.title,
              thumbnail: newChannel.thumbnail,
              channelUrl: newChannel.channelUrl,
              isFavorite: false, // Not favorited by default, just in feed
            },
          });
          console.log("[Add Channel ID API] Channel added to user pool");
        }
      } catch (error) {
        console.error("[Add Channel ID API] Error adding to user pool:", error);
        // Don't fail the whole request if adding to user pool fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Channel added successfully. The page will refresh to show the new channel.",
      channelId: newChannel.channelId,
      addedToUserPool: addToUserPool,
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

