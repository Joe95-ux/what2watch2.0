import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Get performance benchmarks for a category or overall
 * GET /api/youtube/benchmarks?category=tech&metric=engagement
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

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const metric = searchParams.get("metric") || "all";

    // Get channel diagnostics for benchmarking
    const diagnostics = await db.channelDiagnostic.findMany({
      where: {
        ...(category && {
          // We'll need to infer category from channel data or use a different approach
        }),
      },
      take: 100, // Sample size for benchmarks
      orderBy: {
        analyzedAt: "desc",
      },
    });

    if (diagnostics.length === 0) {
      return NextResponse.json({
        benchmarks: {
          avgViews: 0,
          avgEngagement: 0,
          avgUploadFrequency: 0,
          medianViews: 0,
          medianEngagement: 0,
          p25Views: 0,
          p75Views: 0,
          p25Engagement: 0,
          p75Engagement: 0,
        },
        sampleSize: 0,
        category,
      });
    }

    // Extract metrics
    const views = diagnostics
      .map((d) => parseInt(d.avgViews || "0", 10))
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    
    const engagements = diagnostics
      .map((d) => d.avgEngagement)
      .filter((e) => e > 0)
      .sort((a, b) => a - b);

    const uploadFrequencies = diagnostics
      .map((d) => d.uploadFrequency)
      .filter((f) => f > 0);

    // Calculate percentiles
    const getPercentile = (arr: number[], percentile: number): number => {
      if (arr.length === 0) return 0;
      const index = Math.floor((percentile / 100) * arr.length);
      return arr[Math.min(index, arr.length - 1)];
    };

    const avgViews = views.length > 0 ? views.reduce((a, b) => a + b, 0) / views.length : 0;
    const avgEngagement = engagements.length > 0 ? engagements.reduce((a, b) => a + b, 0) / engagements.length : 0;
    const avgUploadFrequency = uploadFrequencies.length > 0 ? uploadFrequencies.reduce((a, b) => a + b, 0) / uploadFrequencies.length : 0;

    const medianViews = getPercentile(views, 50);
    const medianEngagement = getPercentile(engagements, 50);
    const p25Views = getPercentile(views, 25);
    const p75Views = getPercentile(views, 75);
    const p25Engagement = getPercentile(engagements, 25);
    const p75Engagement = getPercentile(engagements, 75);

    return NextResponse.json({
      benchmarks: {
        avgViews: Math.round(avgViews),
        avgEngagement: parseFloat(avgEngagement.toFixed(2)),
        avgUploadFrequency: parseFloat(avgUploadFrequency.toFixed(2)),
        medianViews: Math.round(medianViews),
        medianEngagement: parseFloat(medianEngagement.toFixed(2)),
        p25Views: Math.round(p25Views),
        p75Views: Math.round(p75Views),
        p25Engagement: parseFloat(p25Engagement.toFixed(2)),
        p75Engagement: parseFloat(p75Engagement.toFixed(2)),
      },
      sampleSize: diagnostics.length,
      category,
    });
  } catch (error) {
    console.error("Error calculating benchmarks:", error);
    return NextResponse.json(
      { error: "Failed to calculate benchmarks" },
      { status: 500 }
    );
  }
}
