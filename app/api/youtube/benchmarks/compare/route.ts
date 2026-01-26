import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Compare a channel's performance against benchmarks
 * GET /api/youtube/benchmarks/compare?channelId=UC...&category=tech
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
    const channelId = searchParams.get("channelId");
    const category = searchParams.get("category") || undefined;

    if (!channelId) {
      return NextResponse.json(
        { error: "channelId parameter is required" },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get channel diagnostic
    const diagnostic = await db.channelDiagnostic.findFirst({
      where: {
        channelId,
        analyzedBy: user.id,
      },
      orderBy: {
        analyzedAt: "desc",
      },
    });

    if (!diagnostic) {
      return NextResponse.json(
        { error: "Channel diagnostic not found. Please run a diagnostic first." },
        { status: 404 }
      );
    }

    // Get benchmarks
    const benchmarksUrl = new URL(`${request.nextUrl.origin}/api/youtube/benchmarks`);
    if (category) benchmarksUrl.searchParams.set("category", category);

    const benchmarksResponse = await fetch(benchmarksUrl.toString(), {
      headers: {
        "Cookie": request.headers.get("cookie") || "",
      },
    });

    if (!benchmarksResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch benchmarks" },
        { status: benchmarksResponse.status }
      );
    }

    const benchmarksData = await benchmarksResponse.json();
    const benchmarks = benchmarksData.benchmarks;

    // Calculate channel metrics
    const channelViews = parseInt(diagnostic.avgViews || "0", 10);
    const channelEngagement = diagnostic.avgEngagement;
    const channelUploadFreq = diagnostic.uploadFrequency;

    // Calculate percentiles
    const calculatePercentile = (value: number, p25: number, median: number, p75: number): number => {
      if (value <= p25) {
        return (value / p25) * 25;
      } else if (value <= median) {
        return 25 + ((value - p25) / (median - p25)) * 25;
      } else if (value <= p75) {
        return 50 + ((value - median) / (p75 - median)) * 25;
      } else {
        return 75 + Math.min(((value - p75) / (p75 * 2)) * 25, 25);
      }
    };

    const viewsPercentile = benchmarks.medianViews > 0
      ? Math.min(100, Math.max(0, calculatePercentile(channelViews, benchmarks.p25Views, benchmarks.medianViews, benchmarks.p75Views)))
      : 50;

    const engagementPercentile = benchmarks.medianEngagement > 0
      ? Math.min(100, Math.max(0, calculatePercentile(channelEngagement, benchmarks.p25Engagement, benchmarks.medianEngagement, benchmarks.p75Engagement)))
      : 50;

    // Calculate performance score (0-100)
    const performanceScore = (viewsPercentile * 0.6 + engagementPercentile * 0.4);

    // Determine performance tier
    let performanceTier: "excellent" | "good" | "average" | "below_average";
    if (performanceScore >= 75) {
      performanceTier = "excellent";
    } else if (performanceScore >= 50) {
      performanceTier = "good";
    } else if (performanceScore >= 25) {
      performanceTier = "average";
    } else {
      performanceTier = "below_average";
    }

    return NextResponse.json({
      channelId,
      channelMetrics: {
        avgViews: channelViews,
        avgEngagement: channelEngagement,
        uploadFrequency: channelUploadFreq,
      },
      benchmarks,
      comparison: {
        viewsPercentile: Math.round(viewsPercentile),
        engagementPercentile: Math.round(engagementPercentile),
        performanceScore: Math.round(performanceScore),
        performanceTier,
        viewsVsAverage: channelViews > 0 && benchmarks.avgViews > 0
          ? ((channelViews - benchmarks.avgViews) / benchmarks.avgViews) * 100
          : 0,
        engagementVsAverage: benchmarks.avgEngagement > 0
          ? ((channelEngagement - benchmarks.avgEngagement) / benchmarks.avgEngagement) * 100
          : 0,
      },
      sampleSize: benchmarksData.sampleSize,
    });
  } catch (error) {
    console.error("Error comparing channel to benchmarks:", error);
    return NextResponse.json(
      { error: "Failed to compare channel performance" },
      { status: 500 }
    );
  }
}
