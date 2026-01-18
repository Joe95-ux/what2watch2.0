import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Background job to calculate trends from video snapshots
 * This processes snapshots and generates trend data
 * Supports both GET (for Vercel Cron) and POST requests
 */
export async function GET(request: NextRequest) {
  return handleTrendCalculation(request);
}

export async function POST(request: NextRequest) {
  return handleTrendCalculation(request);
}

async function handleTrendCalculation(request: NextRequest) {
  try {
    // Support both cron secret and user session authentication
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;
    
    // Check if it's a cron request with secret
    const isCronRequest = expectedToken && authHeader === `Bearer ${expectedToken}`;
    
    // If not cron request, check for user authentication (for manual triggers)
    if (!isCronRequest) {
      const { userId: clerkUserId } = await auth();
      if (!clerkUserId) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      
      // For manual triggers, verify user is admin
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { role: true, isForumAdmin: true },
      });
      
      if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.isForumAdmin)) {
        return NextResponse.json(
          { error: "Forbidden: Admin access required" },
          { status: 403 }
        );
      }
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get recent snapshots
    const recentSnapshots = await db.youTubeVideoSnapshot.findMany({
      where: {
        snapshotDate: { gte: oneDayAgo },
      },
      orderBy: {
        snapshotDate: "desc",
      },
    });

    if (recentSnapshots.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No snapshots to process",
        trendsCreated: 0,
      });
    }

    // Extract keywords from video titles and tags
    const keywordMap = new Map<string, {
      videos: Set<string>;
      totalViews: number;
      totalEngagement: number;
      snapshots: typeof recentSnapshots;
    }>();

    for (const snapshot of recentSnapshots) {
      // Extract keywords from title
      const titleWords = (snapshot.title || "")
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3)
        .filter((word) => !/^(the|and|for|are|but|not|you|all|can|her|was|one|our|out|day|get|has|him|his|how|its|may|new|now|old|see|two|way|who|boy|did|its|let|put|say|she|too|use)$/.test(word));

      // Extract keywords from tags
      const tagWords = (snapshot.tags || []).map((tag) => tag.toLowerCase());

      const allKeywords = [...titleWords, ...tagWords];

      for (const keyword of allKeywords) {
        if (!keywordMap.has(keyword)) {
          keywordMap.set(keyword, {
            videos: new Set(),
            totalViews: 0,
            totalEngagement: 0,
            snapshots: [],
          });
        }

        const entry = keywordMap.get(keyword)!;
        entry.videos.add(snapshot.videoId);
        entry.totalViews += parseInt(snapshot.viewCount || "0", 10);
        entry.totalEngagement += snapshot.engagementRate || 0;
        entry.snapshots.push(snapshot);
      }
    }

    // Calculate trends for each keyword
    let trendsCreated = 0;
    let trendsUpdated = 0;

    for (const [keyword, data] of keywordMap.entries()) {
      // Only process keywords with at least 3 videos
      if (data.videos.size < 3) continue;

      // Get previous period data for momentum calculation
      const previousPeriodSnapshots = await db.youTubeVideoSnapshot.findMany({
        where: {
          OR: [
            { title: { contains: keyword, mode: "insensitive" } },
            { tags: { has: keyword } },
          ],
          snapshotDate: {
            gte: oneWeekAgo,
            lt: oneDayAgo,
          },
        },
      });

      const currentAvgViews = data.totalViews / data.videos.size;
      const currentAvgEngagement = data.totalEngagement / data.snapshots.length;

      // Calculate previous period averages
      const previousAvgViews =
        previousPeriodSnapshots.length > 0
          ? previousPeriodSnapshots.reduce(
              (sum, s) => sum + parseInt(s.viewCount || "0", 10),
              0
            ) / previousPeriodSnapshots.length
          : currentAvgViews;

      // Calculate momentum (percentage change)
      const momentum =
        previousAvgViews > 0
          ? ((currentAvgViews - previousAvgViews) / previousAvgViews) * 100
          : 0;

      // Only create trends with positive momentum or high engagement
      if (momentum < -50 && currentAvgEngagement < 1) continue;

      // Determine category (basic categorization)
      const category = determineCategory(keyword, data.snapshots);

      // Check if trend exists for today
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const existingTrend = await db.youTubeTrend.findFirst({
        where: {
          keyword,
          period: "daily",
          startDate: { gte: todayStart },
        },
      });

      if (existingTrend) {
        // Update existing trend
        await db.youTubeTrend.update({
          where: { id: existingTrend.id },
          data: {
            searchVolume: data.videos.size * 100,
            videoCount: data.videos.size,
            avgViews: currentAvgViews.toString(),
            avgEngagement: currentAvgEngagement,
            momentum,
            endDate: now,
          },
        });
        trendsUpdated++;
      } else {
        // Create new trend
        await db.youTubeTrend.create({
          data: {
            keyword,
            category,
            searchVolume: data.videos.size * 100, // Estimate based on video count
            videoCount: data.videos.size,
            avgViews: currentAvgViews.toString(),
            avgEngagement: currentAvgEngagement,
            momentum,
            period: "daily",
            startDate: oneDayAgo,
            endDate: now,
          },
        });
        trendsCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      trendsCreated,
      trendsUpdated,
      keywordsProcessed: keywordMap.size,
      message: trendsCreated > 0 || trendsUpdated > 0
        ? `Successfully processed ${trendsCreated} new trends and updated ${trendsUpdated} existing trends`
        : "No trends were created or updated. This may be normal if there are no new patterns detected.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in trend calculation job:", error);
    return NextResponse.json(
      { error: "Failed to calculate trends" },
      { status: 500 }
    );
  }
}

function determineCategory(
  keyword: string,
  snapshots: Array<{ tags: string[]; title: string | null }>
): string | null {
  const techKeywords = ["tech", "technology", "iphone", "android", "laptop", "computer", "software", "app", "ai", "gadget"];
  const gamingKeywords = ["game", "gaming", "playstation", "xbox", "nintendo", "stream", "twitch"];
  const entertainmentKeywords = ["movie", "film", "tv", "show", "series", "trailer", "review", "reaction"];
  const educationKeywords = ["tutorial", "learn", "how to", "guide", "course", "lesson", "education"];

  const keywordLower = keyword.toLowerCase();
  const allText = `${keywordLower} ${snapshots.flatMap((s) => s.tags).join(" ")} ${snapshots.map((s) => s.title || "").join(" ")}`.toLowerCase();

  if (techKeywords.some((k) => allText.includes(k))) return "tech";
  if (gamingKeywords.some((k) => allText.includes(k))) return "gaming";
  if (entertainmentKeywords.some((k) => allText.includes(k))) return "entertainment";
  if (educationKeywords.some((k) => allText.includes(k))) return "education";

  return null;
}
