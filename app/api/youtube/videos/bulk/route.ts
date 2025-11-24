import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

interface BulkVideoInput {
  videoId?: string;
  id?: string;
  title: string;
  thumbnail?: string;
  channelId: string;
  channelTitle?: string;
  duration?: string;
  videoUrl?: string;
  description?: string;
  publishedAt?: string;
}

interface BulkOperationRequest {
  action: "addToFavorites" | "removeFromFavorites" | "addToWatchlist" | "removeFromWatchlist";
  videoIds: string[];
  videos: BulkVideoInput[];
}

/**
 * Bulk operations for YouTube videos (favorites/watchlist)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const body: BulkOperationRequest = await request.json();
    const { action, videoIds, videos } = body;

    if (!action || !videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid request. action and videoIds array required." },
        { status: 400 }
      );
    }

    if (!videos || !Array.isArray(videos)) {
      return NextResponse.json(
        { error: "Videos array is required" },
        { status: 400 }
      );
    }

    let result: { count: number };

    switch (action) {
      case "addToFavorites": {
        const data = videos.map((video: BulkVideoInput) => ({
          userId: user.id,
          videoId: video.videoId || video.id || "",
          title: video.title,
          thumbnail: video.thumbnail,
          channelId: video.channelId,
          channelTitle: video.channelTitle,
          duration: video.duration,
          videoUrl: video.videoUrl || `https://www.youtube.com/watch?v=${video.videoId || video.id}`,
          description: video.description,
          publishedAt: video.publishedAt,
        }));

        // MongoDB doesn't support skipDuplicates, so we'll create items individually
        // and catch duplicate errors
        let createdCount = 0;
        for (const item of data) {
          try {
            await db.youTubeVideoFavorite.create({
              data: item,
            });
            createdCount++;
          } catch (error: unknown) {
            // Ignore duplicate key errors (E11000)
            if (error && typeof error === 'object' && 'code' in error && error.code !== 11000) {
              throw error;
            }
          }
        }
        result = { count: createdCount };
        break;
      }

      case "removeFromFavorites": {
        result = await db.youTubeVideoFavorite.deleteMany({
          where: {
            userId: user.id,
            videoId: { in: videoIds },
          },
        });
        break;
      }

      case "addToWatchlist": {
        const data = videos.map((video: BulkVideoInput) => ({
          userId: user.id,
          videoId: video.videoId || video.id || "",
          title: video.title,
          thumbnail: video.thumbnail,
          channelId: video.channelId,
          channelTitle: video.channelTitle,
          duration: video.duration,
          videoUrl: video.videoUrl || `https://www.youtube.com/watch?v=${video.videoId || video.id}`,
          description: video.description,
          publishedAt: video.publishedAt,
        }));

        // MongoDB doesn't support skipDuplicates, so we'll create items individually
        // and catch duplicate errors
        let createdCount = 0;
        for (const item of data) {
          try {
            await db.youTubeVideoWatchlistItem.create({
              data: item,
            });
            createdCount++;
          } catch (error: unknown) {
            // Ignore duplicate key errors (E11000)
            if (error && typeof error === 'object' && 'code' in error && error.code !== 11000) {
              throw error;
            }
          }
        }
        result = { count: createdCount };
        break;
      }

      case "removeFromWatchlist": {
        result = await db.youTubeVideoWatchlistItem.deleteMany({
          where: {
            userId: user.id,
            videoId: { in: videoIds },
          },
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      count: result.count || 0,
    });
  } catch (error) {
    console.error("Error in bulk operation:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk operation" },
      { status: 500 }
    );
  }
}

