import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Background job to check for new videos from favorite channels
 * This should be called periodically (e.g., via cron job)
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add API key authentication for cron jobs
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    // Get all users with favorite channels
    const usersWithFavorites = await db.user.findMany({
      where: {
        favoriteChannels: {
          some: {},
        },
      },
      include: {
        favoriteChannels: {
          take: 50, // Limit to avoid too many API calls
        },
      },
    });

    let totalNotifications = 0;

    for (const user of usersWithFavorites) {
      for (const favoriteChannel of user.favoriteChannels) {
        try {
          // Fetch recent videos from channel (last 24 hours)
          const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
          searchUrl.searchParams.set("part", "snippet");
          searchUrl.searchParams.set("channelId", favoriteChannel.channelId);
          searchUrl.searchParams.set("type", "video");
          searchUrl.searchParams.set("maxResults", "10");
          searchUrl.searchParams.set("order", "date");
          searchUrl.searchParams.set("publishedAfter", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
          searchUrl.searchParams.set("key", YOUTUBE_API_KEY);

          const response = await fetch(searchUrl.toString());

          if (!response.ok) {
            console.error(`Failed to fetch videos for channel ${favoriteChannel.channelId}`);
            continue;
          }

          const data = await response.json();

          if (!data.items || data.items.length === 0) {
            continue;
          }

          // Get channel details
          const channelResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?id=${favoriteChannel.channelId}&part=snippet&key=${YOUTUBE_API_KEY}`
          );
          const channelData = channelResponse.ok ? await channelResponse.json() : null;
          const channelInfo = channelData?.items?.[0]?.snippet;

          // Create notifications for new videos
          for (const item of data.items) {
            const videoId = item.id.videoId;
            const publishedAt = new Date(item.snippet.publishedAt);

            // Check if notification already exists
            const existing = await db.youTubeNotification.findUnique({
              where: {
                userId_videoId: {
                  userId: user.id,
                  videoId,
                },
              },
            });

            if (!existing) {
              await db.youTubeNotification.create({
                data: {
                  userId: user.id,
                  channelId: favoriteChannel.channelId,
                  channelTitle: channelInfo?.title || favoriteChannel.title,
                  channelThumbnail: channelInfo?.thumbnails?.high?.url || favoriteChannel.thumbnail,
                  videoId,
                  videoTitle: item.snippet.title,
                  videoThumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
                  videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                  publishedAt,
                },
              });
              totalNotifications++;
            }
          }
        } catch (error) {
          console.error(`Error processing channel ${favoriteChannel.channelId}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      usersProcessed: usersWithFavorites.length,
      notificationsCreated: totalNotifications,
    });
  } catch (error) {
    console.error("Error checking for new videos:", error);
    return NextResponse.json(
      { error: "Failed to check for new videos" },
      { status: 500 }
    );
  }
}

