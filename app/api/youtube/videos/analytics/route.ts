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
        peakWatchingTimes: {
          byHour: Array.from({ length: 24 }, (_, i) => ({ hour: i, views: 0 })),
          byDayOfWeek: Array.from({ length: 7 }, (_, i) => ({
            day: i,
            dayName: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i],
            views: 0,
          })),
        },
        sourceBreakdown: [],
        categoryBreakdown: [],
        engagementRates: {
          likeRate: 0,
          watchlistRate: 0,
          playlistRate: 0,
          overallEngagementRate: 0,
        },
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
    const topVideosGrouped = await db.youTubeVideoView.groupBy({
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

    // Get video titles from favorites or watchlist
    const videoIds = topVideosGrouped.map((v) => v.videoId);
    const videoTitlesMap = new Map<string, string>();
    
    // Try to get titles from favorites first
    const favoriteVideos = await db.youTubeVideoFavorite.findMany({
      where: {
        videoId: { in: videoIds },
        userId: user.id,
      },
      select: {
        videoId: true,
        title: true,
      },
    });
    
    favoriteVideos.forEach((v) => {
      videoTitlesMap.set(v.videoId, v.title);
    });
    
    // Fill in missing titles from watchlist
    const missingVideoIds = videoIds.filter((id) => !videoTitlesMap.has(id));
    if (missingVideoIds.length > 0) {
      const watchlistVideos = await db.youTubeVideoWatchlistItem.findMany({
        where: {
          videoId: { in: missingVideoIds },
          userId: user.id,
        },
        select: {
          videoId: true,
          title: true,
        },
      });
      
      watchlistVideos.forEach((v) => {
        if (!videoTitlesMap.has(v.videoId)) {
          videoTitlesMap.set(v.videoId, v.title);
        }
      });
    }

    // Get top channels
    const topChannelsGrouped = await db.youTubeVideoView.groupBy({
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

    // Get channel titles
    const channelIds = topChannelsGrouped.map((c) => c.channelId);
    const channels = await db.youTubeChannel.findMany({
      where: {
        channelId: { in: channelIds },
      },
      select: {
        channelId: true,
        title: true,
      },
    });
    
    const channelTitlesMap = new Map<string, string>();
    channels.forEach((c) => {
      if (c.title) {
        channelTitlesMap.set(c.channelId, c.title);
      }
    });
    
    // Fill in missing channel titles from favorite channels
    const missingChannelIds = channelIds.filter((id) => !channelTitlesMap.has(id));
    if (missingChannelIds.length > 0) {
      const favoriteChannels = await db.favoriteChannel.findMany({
        where: {
          channelId: { in: missingChannelIds },
          userId: user.id,
        },
        select: {
          channelId: true,
          title: true,
        },
      });
      
      favoriteChannels.forEach((c) => {
        if (c.title && !channelTitlesMap.has(c.channelId)) {
          channelTitlesMap.set(c.channelId, c.title);
        }
      });
    }

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

    // Get all views for additional analytics
    const allViews = await db.youTubeVideoView.findMany({
      where,
      select: {
        createdAt: true,
        source: true,
        categoryId: true,
        liked: true,
        addedToWatchlist: true,
        addedToPlaylist: true,
      },
    });

    // Peak watching times - Hour of day
    const viewsByHour = new Map<number, number>();
    allViews.forEach((view) => {
      const hour = new Date(view.createdAt).getHours();
      viewsByHour.set(hour, (viewsByHour.get(hour) || 0) + 1);
    });
    const peakHours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      views: viewsByHour.get(i) || 0,
    }));

    // Peak watching times - Day of week
    const viewsByDayOfWeek = new Map<number, number>();
    allViews.forEach((view) => {
      const dayOfWeek = new Date(view.createdAt).getDay(); // 0 = Sunday, 6 = Saturday
      viewsByDayOfWeek.set(dayOfWeek, (viewsByDayOfWeek.get(dayOfWeek) || 0) + 1);
    });
    const peakDays = Array.from({ length: 7 }, (_, i) => ({
      day: i,
      dayName: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i],
      views: viewsByDayOfWeek.get(i) || 0,
    }));

    // Source breakdown
    const viewsBySource = new Map<string, number>();
    allViews.forEach((view) => {
      const source = view.source || "unknown";
      viewsBySource.set(source, (viewsBySource.get(source) || 0) + 1);
    });
    const sourceBreakdown = Array.from(viewsBySource.entries())
      .map(([source, count]) => ({
        source: source.charAt(0).toUpperCase() + source.slice(1),
        views: count,
        percentage: totalViews > 0 ? (count / totalViews) * 100 : 0,
      }))
      .sort((a, b) => b.views - a.views);

    // Category breakdown
    const viewsByCategory = new Map<string, number>();
    allViews.forEach((view) => {
      if (view.categoryId) {
        const categoryName = YOUTUBE_CATEGORIES[view.categoryId] || `Category ${view.categoryId}`;
        viewsByCategory.set(categoryName, (viewsByCategory.get(categoryName) || 0) + 1);
      }
    });
    const categoryBreakdown = Array.from(viewsByCategory.entries())
      .map(([category, count]) => ({
        category,
        views: count,
        percentage: totalViews > 0 ? (count / totalViews) * 100 : 0,
      }))
      .sort((a, b) => b.views - a.views);

    // Engagement rates
    const engagementRates = {
      likeRate: totalViews > 0 ? (likedCount / totalViews) * 100 : 0,
      watchlistRate: totalViews > 0 ? (watchlistAdds / totalViews) * 100 : 0,
      playlistRate: totalViews > 0 ? (playlistAdds / totalViews) * 100 : 0,
      overallEngagementRate:
        totalViews > 0
          ? ((likedCount + watchlistAdds + playlistAdds) / totalViews) * 100
          : 0,
    };

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
      topVideos: topVideosGrouped.map((v) => ({
        videoId: v.videoId,
        videoTitle: videoTitlesMap.get(v.videoId) || null,
        viewCount: v._count.id,
      })),
      topChannels: topChannelsGrouped.map((c) => ({
        channelId: c.channelId,
        channelTitle: channelTitlesMap.get(c.channelId) || null,
        viewCount: c._count.id,
      })),
      viewsOverTime: viewsByDay,
      peakWatchingTimes: {
        byHour: peakHours,
        byDayOfWeek: peakDays,
      },
      sourceBreakdown,
      categoryBreakdown,
      engagementRates,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

