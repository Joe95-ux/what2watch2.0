import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    let currentUserId: string | null = null;

    if (clerkUserId) {
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });
      currentUserId = user?.id ?? null;
    }

    const searchParams = request.nextUrl.searchParams;
    const pageParam = Number(searchParams.get("page") || 1);
    const limitParam = Number(searchParams.get("limit") || DEFAULT_LIMIT);
    const categoryFilter = searchParams.get("category");
    const searchQuery = searchParams.get("search");

    const limit = Math.max(1, Math.min(MAX_LIMIT, limitParam));
    const page = Math.max(1, pageParam);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.YouTubeChannelWhereInput = {
      isActive: true,
    };

    // If user is logged in, show both public and their private channels
    // If not logged in, only show public channels
    if (currentUserId) {
      where.OR = [
        { isPrivate: false },
        { isPrivate: true, addedByUserId: currentUserId },
      ];
    } else {
      where.isPrivate = false;
    }

    // Get all channels
    const [channels, total] = await Promise.all([
      db.youTubeChannel.findMany({
        where,
        orderBy: { order: "asc" },
        skip,
        take: limit,
        select: {
          id: true,
          channelId: true,
          slug: true,
          title: true,
          thumbnail: true,
          channelUrl: true,
          isActive: true,
          isPrivate: true,
        },
      }),
      db.youTubeChannel.count({ where }),
    ]);

    // Helper function to extract category name from Freebase topic URL
    const extractCategoryName = (url: string): string => {
      try {
        // Freebase URLs typically look like: https://en.wikipedia.org/wiki/Category:Topic_Name
        // or https://en.wikipedia.org/wiki/Topic_Name
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split("/");
        const lastPart = pathParts[pathParts.length - 1];
        
        // Remove "Category:" prefix if present
        const categoryName = lastPart.replace(/^Category:/, "").replace(/_/g, " ");
        
        // Decode URL encoding
        return decodeURIComponent(categoryName);
      } catch {
        // If URL parsing fails, try to extract from the URL string directly
        const match = url.match(/\/([^\/]+)$/);
        if (match) {
          return match[1].replace(/_/g, " ").replace(/^Category:/, "");
        }
        return url;
      }
    };

    // Fetch channel stats and topicDetails from YouTube API
    const channelStatsMap = new Map<string, { subscriberCount: string; videoCount: string }>();
    const channelCategoriesMap = new Map<string, string[]>();
    const allCategoriesSet = new Set<string>();
    
    if (channels.length > 0) {
      const channelIds = channels.map((c) => c.channelId);
      // Fetch stats and topicDetails in batches to avoid API limits
      const batchSize = 50;
      for (let i = 0; i < channelIds.length; i += batchSize) {
        const batch = channelIds.slice(i, i + batchSize);
        try {
          const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
          if (!YOUTUBE_API_KEY) break;
          
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?id=${batch.join(",")}&part=statistics,topicDetails&key=${YOUTUBE_API_KEY}`,
            { next: { revalidate: 300 } }
          );
          if (response.ok) {
            const data = await response.json();
            if (data.items) {
              data.items.forEach((item: any) => {
                // Store stats
                channelStatsMap.set(item.id, {
                  subscriberCount: item.statistics?.subscriberCount || "0",
                  videoCount: item.statistics?.videoCount || "0",
                });
                
                // Extract categories from topicDetails
                const topicDetails = item.topicDetails;
                if (topicDetails) {
                  const categories: string[] = [];
                  
                  // Extract from topicCategories (URLs)
                  if (topicDetails.topicCategories && Array.isArray(topicDetails.topicCategories)) {
                    topicDetails.topicCategories.forEach((url: string) => {
                      const categoryName = extractCategoryName(url);
                      if (categoryName && !categories.includes(categoryName)) {
                        categories.push(categoryName);
                        allCategoriesSet.add(categoryName);
                      }
                    });
                  }
                  
                  // Extract from topicIds (Freebase IDs) - use as fallback or supplement
                  if (topicDetails.topicIds && Array.isArray(topicDetails.topicIds)) {
                    // For topicIds, we can use them as-is or try to map them
                    // For now, we'll use them as supplementary info
                    topicDetails.topicIds.forEach((topicId: string) => {
                      // Freebase IDs look like /m/0xxx
                      // We can use them as identifiers if needed
                      // For now, we'll rely primarily on topicCategories
                    });
                  }
                  
                  if (categories.length > 0) {
                    channelCategoriesMap.set(item.id, categories);
                  }
                }
              });
            }
          }
        } catch (error) {
          console.error("[YouTubeChannelsAll] Error fetching channel stats and topics:", error);
        }
      }
    }

    // Get channel IDs
    const channelIds = channels.map((c) => c.channelId);

    // Get average ratings for channels
    const channelRatings = await db.channelReview.groupBy({
      by: ["channelId"],
      where: {
        channelId: { in: channelIds },
        status: "published",
      },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

    const ratingsMap = new Map<string, { average: number; count: number }>();
    channelRatings.forEach((rating) => {
      if (rating._avg.rating) {
        ratingsMap.set(rating.channelId, {
          average: rating._avg.rating,
          count: rating._count.id,
        });
      }
    });

    // Filter by category if specified
    let filteredChannels = channels;
    if (categoryFilter) {
      filteredChannels = channels.filter((channel) => {
        const categories = channelCategoriesMap.get(channel.channelId) || [];
        return categories.some((cat) => cat === categoryFilter);
      });
    }

    // Filter by search query if specified
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredChannels = filteredChannels.filter(
        (channel) =>
          channel.title?.toLowerCase().includes(query) ||
          channel.slug?.toLowerCase().includes(query)
      );
    }

    // Get available categories from all channels (from topicDetails)
    const availableCategories = Array.from(allCategoriesSet).sort();

    // Build response
    const response = filteredChannels.map((channel) => {
      const categories = (channelCategoriesMap.get(channel.channelId) || []).slice(0, 4); // Limit to 4 categories
      const rating = ratingsMap.get(channel.channelId);
      const stats = channelStatsMap.get(channel.channelId);

      return {
        id: channel.id,
        channelId: channel.channelId,
        slug: channel.slug,
        title: channel.title,
        thumbnail: channel.thumbnail,
        channelUrl: channel.channelUrl,
        isActive: channel.isActive,
        isPrivate: channel.isPrivate,
        categories,
        rating: rating
          ? {
              average: Number(rating.average.toFixed(1)),
              count: rating.count,
            }
          : null,
        subscriberCount: stats?.subscriberCount || "0",
        videoCount: stats?.videoCount || "0",
      };
    });

    return NextResponse.json({
      channels: response,
      pagination: {
        page,
        limit,
        total: filteredChannels.length,
        totalPages: Math.ceil(filteredChannels.length / limit) || 1,
      },
      availableCategories,
    });
  } catch (error) {
    console.error("[YouTubeChannelsAll] GET error", error);
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 });
  }
}

