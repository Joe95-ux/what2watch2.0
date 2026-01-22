import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Get format recommendations for a topic/keyword
 * GET /api/youtube/formats/recommendations?keyword=iphone&category=tech
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

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword");
    const category = searchParams.get("category") || undefined;

    // If keyword is provided, use analysis data to generate recommendations
    if (keyword && YOUTUBE_API_KEY) {
      // Call the analyze endpoint to get format analysis
      const analyzeUrl = new URL(`${request.nextUrl.origin}/api/youtube/formats/analyze`);
      analyzeUrl.searchParams.set("keyword", keyword);
      analyzeUrl.searchParams.set("limit", "30");

      try {
        const analyzeResponse = await fetch(analyzeUrl.toString(), {
          headers: {
            "Cookie": request.headers.get("cookie") || "",
          },
        });

        if (analyzeResponse.ok) {
          const analyzeData = await analyzeResponse.json();
          
          // Generate recommendations from analysis data
          const recommendations = analyzeData.formatAnalysis
            .map((format: any) => ({
              format: format.format,
              videoCount: format.videoCount,
              avgEngagement: format.avgEngagement,
              avgViews: format.avgViews.toString(),
              recommendationScore: format.avgEngagement * 0.6 + (format.videoCount / 10) * 0.4, // Weighted score
            }))
            .sort((a: any, b: any) => b.recommendationScore - a.recommendationScore)
            .slice(0, 5);

          return NextResponse.json({
            recommendations,
            keyword,
            category,
          });
        }
      } catch (error) {
        console.error("Error fetching analysis data for recommendations:", error);
        // Fall through to use database data
      }
    }

    // Get format performance data from database
    const formatPerformances = await db.formatPerformance.findMany({
      where: {
        period: "monthly",
        ...(category && { category }),
      },
      orderBy: {
        avgEngagement: "desc",
      },
    });

    // If no performance data, analyze recent video formats
    if (formatPerformances.length === 0) {
      // Get recent video formats from database
      const recentFormats = await db.videoFormat.findMany({
        where: {
          ...(category && { category }),
          detectedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        take: 100,
      });

      // Group by format and calculate averages
      const formatStats = new Map<string, { count: number; formats: typeof recentFormats }>();
      
      for (const format of recentFormats) {
        if (!formatStats.has(format.format)) {
          formatStats.set(format.format, { count: 0, formats: [] });
        }
        const stats = formatStats.get(format.format)!;
        stats.count++;
        stats.formats.push(format);
      }

      // Convert to recommendations
      const recommendations = Array.from(formatStats.entries())
        .map(([format, stats]) => ({
          format,
          videoCount: stats.count,
          avgEngagement: 0, // Would need video stats to calculate
          avgViews: "0",
          recommendationScore: stats.count, // More videos = more popular format
        }))
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, 5);

      return NextResponse.json({
        recommendations,
        keyword,
        category,
      });
    }

    // Use performance data to generate recommendations
    const recommendations = formatPerformances
      .map((perf) => ({
        format: perf.format,
        videoCount: perf.videoCount,
        avgEngagement: perf.avgEngagement,
        avgViews: perf.avgViews,
        recommendationScore: perf.avgEngagement * 0.6 + (perf.videoCount / 100) * 0.4, // Weighted score
      }))
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 5);

    return NextResponse.json({
      recommendations,
      keyword,
      category,
    });
  } catch (error) {
    console.error("Error getting format recommendations:", error);
    return NextResponse.json(
      { error: "Failed to get format recommendations" },
      { status: 500 }
    );
  }
}
