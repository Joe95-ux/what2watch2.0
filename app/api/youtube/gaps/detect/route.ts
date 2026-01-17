import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Detect content gaps by comparing search demand vs video supply
 * GET /api/youtube/gaps/detect?category=tech&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Get recent trends to identify high-demand keywords
    const recentTrends = await db.youTubeTrend.findMany({
      where: {
        period: "daily",
        ...(category && { category }),
        startDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      orderBy: {
        momentum: "desc",
      },
      take: 100, // Get top 100 trending keywords
    });

    if (recentTrends.length === 0) {
      return NextResponse.json({
        gaps: [],
        message: "No trends available yet. Run trend calculation first.",
      });
    }

    // For each trending keyword, check video supply
    const gaps = await Promise.all(
      recentTrends.slice(0, 50).map(async (trend) => {
        // Search YouTube for videos with this keyword
        const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
        searchUrl.searchParams.set("part", "snippet");
        searchUrl.searchParams.set("q", trend.keyword);
        searchUrl.searchParams.set("type", "video");
        searchUrl.searchParams.set("order", "viewCount");
        searchUrl.searchParams.set("maxResults", "10");
        searchUrl.searchParams.set("key", YOUTUBE_API_KEY);

        const searchResponse = await fetch(searchUrl.toString(), {
          next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (!searchResponse.ok) {
          return null;
        }

        const searchData = await searchResponse.json();
        const videoCount = searchData.pageInfo?.totalResults || 0;
        const videoIds = searchData.items?.map((item: any) => item.id.videoId).join(",") || "";

        // Get video details to calculate average age and top views
        let avgVideoAge = 0;
        let topVideoViews = 0;

        if (videoIds) {
          const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
          videosUrl.searchParams.set("part", "snippet,statistics");
          videosUrl.searchParams.set("id", videoIds);
          videosUrl.searchParams.set("key", YOUTUBE_API_KEY);

          const videosResponse = await fetch(videosUrl.toString(), {
            next: { revalidate: 3600 },
          });

          if (videosResponse.ok) {
            const videosData = await videosResponse.json();
            const videos = videosData.items || [];

            if (videos.length > 0) {
              const now = new Date();
              const ages = videos.map((video: any) => {
                const publishedAt = new Date(video.snippet?.publishedAt || now);
                return Math.floor((now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24));
              });
              avgVideoAge = ages.reduce((a: number, b: number) => a + b, 0) / ages.length;

              // Get top video views
              const topVideo = videos[0];
              topVideoViews = parseInt(topVideo.statistics?.viewCount || "0", 10);
            }
          }
        }

        // Calculate gap score
        // Higher score = bigger opportunity
        // Factors:
        // - High search volume (demand)
        // - Low video count (low supply)
        // - High momentum (trending up)
        // - Old videos (opportunity for fresh content)
        const searchVolume = trend.searchVolume || 1000;
        const normalizedVideoCount = Math.max(videoCount, 1); // Avoid division by zero
        const demandSupplyRatio = searchVolume / normalizedVideoCount;
        const momentumScore = Math.max(trend.momentum, 0) / 100; // Normalize momentum
        const freshnessScore = avgVideoAge > 365 ? 1.5 : avgVideoAge > 180 ? 1.2 : 1.0; // Older = better opportunity

        const gapScore =
          (demandSupplyRatio * 0.4 + // Demand/supply ratio (40%)
            momentumScore * 0.3 + // Momentum (30%)
            (avgVideoAge / 365) * 0.2 + // Freshness (20%)
            (topVideoViews < 100000 ? 1.5 : topVideoViews < 500000 ? 1.2 : 1.0) * 0.1) * // Low competition (10%)
          freshnessScore;

        return {
          keyword: trend.keyword,
          category: trend.category || category,
          searchVolume,
          videoCount,
          avgVideoAge: Math.round(avgVideoAge),
          topVideoViews,
          gapScore: Math.round(gapScore * 100) / 100,
          momentum: trend.momentum,
          avgViews: trend.avgViews,
        };
      })
    );

    // Filter out nulls and sort by gap score
    const validGaps = gaps
      .filter((gap): gap is NonNullable<typeof gap> => gap !== null)
      .sort((a, b) => b.gapScore - a.gapScore)
      .slice(0, limit);

    // Store top gaps in database (check if exists by keyword)
    for (const gap of validGaps.slice(0, 20)) {
      const existing = await db.contentGap.findFirst({
        where: { keyword: gap.keyword },
      });

      if (existing) {
        await db.contentGap.update({
          where: { id: existing.id },
          data: {
            searchVolume: gap.searchVolume,
            trendScore: gap.momentum,
            videoCount: gap.videoCount,
            avgVideoAge: gap.avgVideoAge,
            topVideoViews: gap.topVideoViews.toString(),
            gapScore: gap.gapScore,
            category: gap.category || null,
          },
        });
      } else {
        await db.contentGap.create({
          data: {
            keyword: gap.keyword,
            searchVolume: gap.searchVolume,
            trendScore: gap.momentum,
            videoCount: gap.videoCount,
            avgVideoAge: gap.avgVideoAge,
            topVideoViews: gap.topVideoViews.toString(),
            gapScore: gap.gapScore,
            category: gap.category || null,
          },
        });
      }
    }

    return NextResponse.json({
      gaps: validGaps,
      total: validGaps.length,
    });
  } catch (error) {
    console.error("Error detecting content gaps:", error);
    return NextResponse.json(
      { error: "Failed to detect content gaps" },
      { status: 500 }
    );
  }
}
