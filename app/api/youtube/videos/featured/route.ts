import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

interface YouTubeSearchItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      high?: { url: string };
      default?: { url: string };
    };
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
}

interface FeaturedVideo {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  videoUrl: string;
}

/**
 * Get featured videos from active, public YouTube channels
 */
export async function GET() {
  try {
    const { userId } = await auth();
    
    let user = null;
    if (userId) {
      user = await db.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
      });
    }

    // Get active, public channels
    const allChannels = await db.youTubeChannel.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        order: "asc",
      },
      select: {
        channelId: true,
        isPrivate: true,
        addedByUserId: true,
      },
      take: 20, // Limit to 20 channels to avoid too many API calls
    });

    // Filter to only public channels (or user's private channels)
    const channels = allChannels.filter((channel) => {
      const isPublic = channel.isPrivate === false || channel.isPrivate === null || channel.isPrivate === undefined;
      
      if (isPublic) {
        return true;
      }
      
      // If private, only include if user owns it
      if (channel.isPrivate === true && user) {
        return channel.addedByUserId === user.id;
      }
      
      return false;
    });

    if (channels.length === 0) {
      return NextResponse.json({
        videos: [],
      });
    }

    const channelIds = channels.map((c) => c.channelId);
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    const featuredVideos: FeaturedVideo[] = [];

    // Fetch recent videos from channels (limit to first 5 channels to avoid rate limits)
    for (const channelId of channelIds.slice(0, 5)) {
      try {
        const videosUrl = new URL("https://www.googleapis.com/youtube/v3/search");
        videosUrl.searchParams.set("part", "snippet");
        videosUrl.searchParams.set("channelId", channelId);
        videosUrl.searchParams.set("type", "video");
        videosUrl.searchParams.set("maxResults", "4"); // 4 videos per channel
        videosUrl.searchParams.set("order", "date");
        videosUrl.searchParams.set("key", YOUTUBE_API_KEY);

        const response = await fetch(videosUrl.toString(), {
          next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (response.ok) {
          const data: YouTubeSearchResponse = await response.json();
          if (data.items) {
            featuredVideos.push(
              ...data.items.map((item: YouTubeSearchItem): FeaturedVideo => ({
                id: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail:
                  item.snippet.thumbnails.high?.url ||
                  item.snippet.thumbnails.default?.url,
                channelId: item.snippet.channelId,
                channelTitle: item.snippet.channelTitle,
                publishedAt: item.snippet.publishedAt,
                videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
              }))
            );
          }
        }
      } catch (error) {
        console.error(`Error fetching videos for channel ${channelId}:`, error);
        // Continue with other channels even if one fails
      }
    }

    // Shuffle and limit to 20 videos
    const shuffled = featuredVideos.sort(() => Math.random() - 0.5);
    const limited = shuffled.slice(0, 20);

    return NextResponse.json(
      {
        videos: limited,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching featured videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured videos" },
      { status: 500 }
    );
  }
}

