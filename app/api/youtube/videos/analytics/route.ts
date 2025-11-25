import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Get YouTube video analytics for user
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

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // days
    const channelId = searchParams.get("channelId") || undefined;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period, 10));

    const managedChannels = await db.youTubeChannel.findMany({
      where: {
        addedByUserId: user.id,
      },
      select: {
        channelId: true,
      },
    });

    if (managedChannels.length === 0) {
      return NextResponse.json({
        period: parseInt(period, 10),
        stats: {
          totalViews: 0,
          completedViews: 0,
          completionRate: 0,
          totalWatchTime: 0,
          averageWatchTime: 0,
          engagement: {
            liked: 0,
            addedToWatchlist: 0,
            addedToPlaylist: 0,
          },
        },
        topVideos: [],
        topChannels: [],
        viewsOverTime: [],
        message: "Add a channel to see analytics.",
      });
    }

    let channelIds = managedChannels.map((c) => c.channelId);

    if (channelId) {
      if (!channelIds.includes(channelId)) {
        return NextResponse.json(
          { error: "Channel not managed by user" },
          { status: 403 }
        );
      }
      channelIds = [channelId];
    }

    const where: Prisma.YouTubeVideoViewWhereInput = {
      channelId: {
        in: channelIds,
      },
      createdAt: {
        gte: startDate,
      },
    };

    // Get view statistics
    const totalViews = await db.youTubeVideoView.count({ where });
    const completedViews = await db.youTubeVideoView.count({
      where: { ...where, completed: true },
    });
    const totalWatchTime = await db.youTubeVideoView.aggregate({
      where,
      _sum: {
        viewDuration: true,
      },
    });

    // Get top videos
    const topVideos = await db.youTubeVideoView.groupBy({
      by: ["videoId"],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 10,
    });

    // Get top channels
    const topChannels = await db.youTubeVideoView.groupBy({
      by: ["channelId"],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 10,
    });

    // Get engagement stats
    const likedCount = await db.youTubeVideoView.count({
      where: { ...where, liked: true },
    });
    const watchlistAdds = await db.youTubeVideoView.count({
      where: { ...where, addedToWatchlist: true },
    });
    const playlistAdds = await db.youTubeVideoView.count({
      where: { ...where, addedToPlaylist: true },
    });

    // Get views over time (last 30 days)
    const viewsByDay = await db.youTubeVideoView.groupBy({
      by: ["createdAt"],
      where,
      _count: {
        id: true,
      },
    });

    return NextResponse.json({
      period: parseInt(period, 10),
      stats: {
        totalViews,
        completedViews,
        completionRate: totalViews > 0 ? (completedViews / totalViews) * 100 : 0,
        totalWatchTime: totalWatchTime._sum.viewDuration || 0,
        averageWatchTime:
          totalViews > 0
            ? Math.round((totalWatchTime._sum.viewDuration || 0) / totalViews)
            : 0,
        engagement: {
          liked: likedCount,
          addedToWatchlist: watchlistAdds,
          addedToPlaylist: playlistAdds,
        },
      },
      topVideos: topVideos.map((v) => ({
        videoId: v.videoId,
        viewCount: v._count.id,
      })),
      topChannels: topChannels.map((c) => ({
        channelId: c.channelId,
        viewCount: c._count.id,
      })),
      viewsOverTime: viewsByDay,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

