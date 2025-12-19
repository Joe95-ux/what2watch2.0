import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET - Get trending topics (tags) from recent posts
 * Returns the most popular tags from posts created in the last 7 days
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const days = parseInt(searchParams.get("days") || "7", 10);

    // Calculate date threshold (last N days)
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Fetch recent posts with tags
    const recentPosts = await db.forumPost.findMany({
      where: {
        AND: [
          { isHidden: false },
          {
            createdAt: {
              gte: dateThreshold,
            },
          },
          // Only show published posts
          {
            OR: [
              { scheduledAt: null },
              { scheduledAt: { lte: new Date() } },
            ],
          },
          // Only posts with tags
          {
            tags: {
              isEmpty: false,
            },
          },
        ],
      },
      select: {
        id: true,
        tags: true,
        score: true,
        replies: {
          select: {
            id: true,
          },
        },
        createdAt: true,
      },
    });

    // Aggregate tags with their counts and engagement metrics
    const tagMap = new Map<string, {
      tag: string;
      count: number;
      totalScore: number;
      totalReplies: number;
      recentPosts: number;
    }>();

    recentPosts.forEach((post) => {
      post.tags.forEach((tag) => {
        const existing = tagMap.get(tag) || {
          tag,
          count: 0,
          totalScore: 0,
          totalReplies: 0,
          recentPosts: 0,
        };

        existing.count += 1;
        existing.totalScore += post.score || 0;
        existing.totalReplies += post.replies?.length || 0;
        existing.recentPosts += 1;

        tagMap.set(tag, existing);
      });
    });

    // Convert to array and calculate trending score
    // Trending score = (post count * 2) + (total score * 0.5) + (total replies * 0.3)
    const topics = Array.from(tagMap.values())
      .map((topic) => ({
        tag: topic.tag,
        postCount: topic.count,
        totalScore: topic.totalScore,
        totalReplies: topic.totalReplies,
        trendingScore: 
          topic.count * 2 + 
          topic.totalScore * 0.5 + 
          topic.totalReplies * 0.3,
      }))
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit)
      .map((topic) => ({
        id: topic.tag, // Use tag as ID for consistency
        tag: topic.tag,
        postCount: topic.postCount,
        totalScore: topic.totalScore,
        totalReplies: topic.totalReplies,
      }));

    return NextResponse.json({ topics });
  } catch (error) {
    console.error("Error fetching trending topics:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending topics" },
      { status: 500 }
    );
  }
}

