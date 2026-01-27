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

    // Get channel diagnostic - try user's diagnostic first, then any diagnostic for this channel
    let diagnostic = await db.channelDiagnostic.findFirst({
      where: {
        channelId,
        analyzedBy: user.id,
      },
      orderBy: {
        analyzedAt: "desc",
      },
    });

    // If no user-specific diagnostic, try to find any diagnostic for this channel
    if (!diagnostic) {
      diagnostic = await db.channelDiagnostic.findFirst({
        where: {
          channelId,
        },
        orderBy: {
          analyzedAt: "desc",
        },
      });
    }

    if (!diagnostic) {
      return NextResponse.json(
        { error: "Channel diagnostic not found. Please run a diagnostic on this channel first using the Channel Diagnostic tool." },
        { status: 404 }
      );
    }

    // Calculate benchmarks directly instead of using internal fetch
    const allDiagnostics = await db.channelDiagnostic.findMany({
      take: 100,
      orderBy: {
        analyzedAt: "desc",
      },
    });

    if (allDiagnostics.length === 0) {
      return NextResponse.json(
        { error: "No benchmark data available. Please run channel diagnostics first." },
        { status: 404 }
      );
    }

    const views = allDiagnostics
      .map((d) => parseInt(d.avgViews || "0", 10))
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    
    const engagements = allDiagnostics
      .map((d) => d.avgEngagement)
      .filter((e) => e > 0)
      .sort((a, b) => a - b);

    const uploadFrequencies = allDiagnostics
      .map((d) => d.uploadFrequency)
      .filter((f) => f > 0);

    const getPercentile = (arr: number[], percentile: number): number => {
      if (arr.length === 0) return 0;
      const index = Math.floor((percentile / 100) * arr.length);
      return arr[Math.min(index, arr.length - 1)];
    };

    const avgViews = views.length > 0 ? views.reduce((a, b) => a + b, 0) / views.length : 0;
    const avgEngagement = engagements.length > 0 ? engagements.reduce((a, b) => a + b, 0) / engagements.length : 0;
    const avgUploadFrequency = uploadFrequencies.length > 0 ? uploadFrequencies.reduce((a, b) => a + b, 0) / uploadFrequencies.length : 0;

    const benchmarks = {
      avgViews: Math.round(avgViews),
      avgEngagement: parseFloat(avgEngagement.toFixed(2)),
      avgUploadFrequency: parseFloat(avgUploadFrequency.toFixed(2)),
      medianViews: Math.round(getPercentile(views, 50)),
      medianEngagement: parseFloat(getPercentile(engagements, 50).toFixed(2)),
      p25Views: Math.round(getPercentile(views, 25)),
      p75Views: Math.round(getPercentile(views, 75)),
      p25Engagement: parseFloat(getPercentile(engagements, 25).toFixed(2)),
      p75Engagement: parseFloat(getPercentile(engagements, 75).toFixed(2)),
    };

    const sampleSize = allDiagnostics.length;

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
      sampleSize,
    });
  } catch (error) {
    console.error("Error comparing channel to benchmarks:", error);
    return NextResponse.json(
      { error: "Failed to compare channel performance" },
      { status: 500 }
    );
  }
}
