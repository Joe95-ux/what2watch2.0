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

/**
 * Get channel-to-category mappings based on user's viewing history
 * Returns which categories each channel's videos belong to
 */
export async function GET(request: NextRequest) {
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

    // Get all views with category information
    const views = await db.youTubeVideoView.findMany({
      where: {
        userId: user.id,
        categoryId: { not: null },
      },
      select: {
        channelId: true,
        categoryId: true,
      },
    });

    // Map channels to their categories
    const channelCategories = new Map<string, Set<string>>();
    views.forEach((view) => {
      if (view.categoryId) {
        if (!channelCategories.has(view.channelId)) {
          channelCategories.set(view.channelId, new Set());
        }
        channelCategories.get(view.channelId)!.add(view.categoryId);
      }
    });

    // Convert to response format
    const channelCategoryMap: Record<string, string[]> = {};
    channelCategories.forEach((categories, channelId) => {
      channelCategoryMap[channelId] = Array.from(categories).map(
        (catId) => YOUTUBE_CATEGORIES[catId] || `Category ${catId}`
      );
    });

    // Get all available categories from user's viewing history
    const allCategories = new Set<string>();
    views.forEach((view) => {
      if (view.categoryId) {
        const categoryName = YOUTUBE_CATEGORIES[view.categoryId] || `Category ${view.categoryId}`;
        allCategories.add(categoryName);
      }
    });

    return NextResponse.json({
      channelCategories: channelCategoryMap,
      availableCategories: Array.from(allCategories).sort(),
    });
  } catch (error) {
    console.error("Error fetching channel categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch channel categories" },
      { status: 500 }
    );
  }
}

