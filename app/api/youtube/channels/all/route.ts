import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// YouTube Category ID to Name mapping
const YOUTUBE_CATEGORIES: Record<string, string> = {
  "1": "Film & Animation",
  "2": "Autos & Vehicles",
  "10": "Music",
  "15": "Pets & Animals",
  "17": "Sports",
  "19": "Travel & Events",
  "20": "Gaming",
  "22": "People & Blogs",
  "23": "Comedy",
  "24": "Entertainment",
  "25": "News & Politics",
  "26": "Howto & Style",
  "27": "Education",
  "28": "Science & Technology",
  "29": "Nonprofits & Activism",
};

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

    // Get channel IDs
    const channelIds = channels.map((c) => c.channelId);

    // Get categories for these channels (from user's viewing history if logged in)
    const channelCategoriesMap = new Map<string, string[]>();
    if (currentUserId && channelIds.length > 0) {
      const views = await db.youTubeVideoView.findMany({
        where: {
          userId: currentUserId,
          channelId: { in: channelIds },
          categoryId: { not: null },
        },
        select: {
          channelId: true,
          categoryId: true,
        },
      });

      views.forEach((view) => {
        if (view.categoryId) {
          const categoryName = YOUTUBE_CATEGORIES[view.categoryId] || `Category ${view.categoryId}`;
          if (!channelCategoriesMap.has(view.channelId)) {
            channelCategoriesMap.set(view.channelId, []);
          }
          const categories = channelCategoriesMap.get(view.channelId)!;
          if (!categories.includes(categoryName)) {
            categories.push(categoryName);
          }
        }
      });
    }

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

    // Get available categories from all channels
    const allViews = currentUserId
      ? await db.youTubeVideoView.findMany({
          where: {
            userId: currentUserId,
            categoryId: { not: null },
          },
          select: { categoryId: true },
          distinct: ["categoryId"],
        })
      : [];

    const availableCategories = Array.from(
      new Set(
        allViews
          .map((v) => v.categoryId)
          .filter(Boolean)
          .map((catId) => YOUTUBE_CATEGORIES[catId!] || `Category ${catId}`)
      )
    ).sort();

    // Build response
    const response = filteredChannels.map((channel) => {
      const categories = channelCategoriesMap.get(channel.channelId) || [];
      const rating = ratingsMap.get(channel.channelId);

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

