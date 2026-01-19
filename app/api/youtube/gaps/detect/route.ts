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
    // Process in batches to avoid rate limits and improve accuracy
    const batchSize = 10;
    const allGaps: Array<{
      keyword: string;
      category: string | null | undefined;
      searchVolume: number;
      videoCount: number;
      avgVideoAge: number;
      topVideoViews: number;
      gapScore: number;
      momentum: number;
      avgViews: string;
    }> = [];

    for (let i = 0; i < Math.min(recentTrends.length, 50); i += batchSize) {
      const batch = recentTrends.slice(i, i + batchSize);
      
      const batchGaps = await Promise.all(
        batch.map(async (trend) => {
          try {
            // Search YouTube for videos with this keyword
            // Use relevance order first to get better quality results
            const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
            searchUrl.searchParams.set("part", "snippet");
            searchUrl.searchParams.set("q", trend.keyword);
            searchUrl.searchParams.set("type", "video");
            searchUrl.searchParams.set("order", "relevance"); // Use relevance for better quality
            searchUrl.searchParams.set("maxResults", "50"); // Get more results for better accuracy
            searchUrl.searchParams.set("key", YOUTUBE_API_KEY);

            const searchResponse = await fetch(searchUrl.toString(), {
              next: { revalidate: 3600 }, // Cache for 1 hour
            });

            if (!searchResponse.ok) {
              console.warn(`YouTube search failed for keyword: ${trend.keyword}`);
              return null;
            }

            const searchData = await searchResponse.json();
            const items = searchData.items || [];
            
            // Use actual returned items count, not totalResults (which can be inaccurate)
            const videoCount = Math.max(items.length, searchData.pageInfo?.totalResults || 0);
            
            // Filter out low-quality results (videos with very low views might be spam)
            const validVideoIds = items
              .slice(0, 20) // Analyze top 20 results
              .map((item: any) => item.id?.videoId)
              .filter((id: string) => id);

            if (validVideoIds.length === 0) {
              return null;
            }

            const videoIds = validVideoIds.join(",");

            // Get video details to calculate average age and top views
            let avgVideoAge = 0;
            let topVideoViews = 0;
            let totalViews = 0;
            let validVideos = 0;

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
                  const validAges: number[] = [];
                  
                  videos.forEach((video: any) => {
                    const publishedAt = new Date(video.snippet?.publishedAt || now);
                    const age = Math.floor((now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24));
                    const views = parseInt(video.statistics?.viewCount || "0", 10);
                    
                    // Only count videos with reasonable views (filter spam)
                    if (views > 100) {
                      validAges.push(age);
                      totalViews += views;
                      validVideos++;
                    }
                  });

                  if (validAges.length > 0) {
                    avgVideoAge = validAges.reduce((a, b) => a + b, 0) / validAges.length;
                    
                    // Get top video views (highest views from valid videos)
                    const sortedVideos = videos
                      .map((v: any) => parseInt(v.statistics?.viewCount || "0", 10))
                      .filter((views: number) => views > 100)
                      .sort((a: number, b: number) => b - a);
                    
                    topVideoViews = sortedVideos[0] || 0;
                  }
                }
              }
            }

            // Skip if we don't have enough valid data
            if (validVideos === 0 || videoCount === 0) {
              return null;
            }

            // Calculate gap score with improved algorithm
            // Higher score = bigger opportunity
            // Factors:
            // - High search volume relative to video count (demand vs supply)
            // - High momentum (trending up)
            // - Old videos (opportunity for fresh content)
            // - Low competition (top video has low views)
            const searchVolume = trend.searchVolume || 1000;
            const normalizedVideoCount = Math.max(videoCount, 1);
            
            // Improved demand/supply ratio calculation
            // Use logarithmic scale to prevent extreme values
            const demandSupplyRatio = Math.log10(Math.max(searchVolume / normalizedVideoCount, 1));
            
            // Normalize momentum (0-1 scale)
            const momentumScore = Math.min(Math.max(trend.momentum, 0) / 100, 1);
            
            // Freshness bonus (older content = better opportunity)
            const freshnessScore = avgVideoAge > 365 ? 1.5 : avgVideoAge > 180 ? 1.2 : avgVideoAge > 90 ? 1.0 : 0.8;
            
            // Competition score (lower top views = less competition)
            const competitionScore = topVideoViews < 50000 ? 1.5 : topVideoViews < 200000 ? 1.2 : topVideoViews < 1000000 ? 1.0 : 0.8;

            // Weighted gap score
            const gapScore =
              (demandSupplyRatio * 0.35 + // Demand/supply ratio (35%)
                momentumScore * 0.3 + // Momentum (30%)
                (Math.min(avgVideoAge / 365, 2)) * 0.2 + // Freshness (20%, capped at 2 years)
                competitionScore * 0.15) * // Low competition (15%)
              freshnessScore;

            // Only return gaps with meaningful scores
            if (gapScore < 0.5) {
              return null;
            }

            return {
              keyword: trend.keyword,
              category: trend.category || category || null,
              searchVolume,
              videoCount,
              avgVideoAge: Math.round(avgVideoAge),
              topVideoViews,
              gapScore: Math.round(gapScore * 100) / 100,
              momentum: trend.momentum,
              avgViews: trend.avgViews,
            };
          } catch (error) {
            console.error(`Error processing gap for keyword ${trend.keyword}:`, error);
            return null;
          }
        })
      );

      // Add valid gaps from this batch
      allGaps.push(...batchGaps.filter((gap): gap is NonNullable<typeof gap> => gap !== null));
      
      // Small delay between batches to avoid rate limits
      if (i + batchSize < Math.min(recentTrends.length, 50)) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Sort by gap score and take top results
    const validGaps = allGaps
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
