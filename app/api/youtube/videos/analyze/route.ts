import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import OpenAI from "openai";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze video titles and thumbnails for a keyword
 * GET /api/youtube/videos/analyze?keyword=iphone+review&limit=10
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
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (!keyword) {
      return NextResponse.json(
        { error: "keyword is required" },
        { status: 400 }
      );
    }

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    // Search for videos with this keyword
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", keyword);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("order", "viewCount"); // Get top videos by views
    searchUrl.searchParams.set("maxResults", limit.toString());
    searchUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const searchResponse = await fetch(searchUrl.toString(), {
      next: { revalidate: 300 },
    });

    if (!searchResponse.ok) {
      return NextResponse.json(
        { error: "Failed to search YouTube" },
        { status: searchResponse.status }
      );
    }

    const searchData = await searchResponse.json();
    const videoIds = searchData.items?.map((item: any) => item.id.videoId).join(",") || "";

    if (!videoIds) {
      return NextResponse.json({
        videos: [],
        analysis: null,
      });
    }

    // Get video details including statistics
    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("part", "snippet,statistics");
    videosUrl.searchParams.set("id", videoIds);
    videosUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const videosResponse = await fetch(videosUrl.toString(), {
      next: { revalidate: 300 },
    });

    if (!videosResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch video details" },
        { status: videosResponse.status }
      );
    }

    const videosData = await videosResponse.json();
    const videos = videosData.items || [];

    // Analyze titles
    const titleAnalyses = videos.map((video: any) => {
      const title = video.snippet?.title || "";
      const titleLength = title.length;
      const hasQuestion = /[?]/.test(title);
      const hasBrackets = /[\[\]()]/.test(title);
      const hasNumber = /\d/.test(title);
      const words = title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 0);
      const wordCount = words.length;

      // Extract top words (excluding common words)
      const commonWords = new Set([
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
        "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
        "will", "would", "could", "should", "may", "might", "must", "can", "this", "that", "these", "those",
      ]);
      const wordFreq: Record<string, number> = {};
      words.forEach((word: string) => {
        const cleanWord = word.replace(/[^\w]/g, "");
        if (cleanWord.length > 2 && !commonWords.has(cleanWord)) {
          wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
        }
      });
      const topWords = Object.entries(wordFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([word]) => word);

      return {
        videoId: video.id,
        title,
        titleLength,
        hasQuestion,
        hasBrackets,
        hasNumber,
        wordCount,
        topWords,
      };
    });

    // Calculate aggregate statistics
    const avgTitleLength =
      titleAnalyses.reduce((sum: number, a: any) => sum + a.titleLength, 0) /
      titleAnalyses.length;
    const percentWithBrackets =
      (titleAnalyses.filter((a: any) => a.hasBrackets).length / titleAnalyses.length) * 100;
    const percentWithNumbers =
      (titleAnalyses.filter((a: any) => a.hasNumber).length / titleAnalyses.length) * 100;
    const percentWithQuestions =
      (titleAnalyses.filter((a: any) => a.hasQuestion).length / titleAnalyses.length) * 100;

        // Analyze thumbnails with AI
    const thumbnailAnalyses = await Promise.all(
      videos.map(async (video: any) => {
        const thumbnailUrl = video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url;
        if (!thumbnailUrl || !process.env.OPENAI_API_KEY) {
          return {
            videoId: video.id,
            hasFace: false,
            hasText: false,
            dominantColors: [],
            brightness: null,
          };
        }

        try {
          // Use OpenAI Vision API to analyze thumbnail
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Analyze this YouTube thumbnail image. Respond with JSON only: {\"hasFace\": boolean, \"hasText\": boolean, \"dominantColors\": [\"color1\", \"color2\"], \"brightness\": number (0-100)}. hasFace: true if there's a person's face visible. hasText: true if there's text/words visible. dominantColors: top 2-3 color names. brightness: overall brightness 0-100.",
                  },
                  {
                    type: "image_url",
                    image_url: { url: thumbnailUrl },
                  },
                ],
              },
            ],
            max_tokens: 150,
            response_format: { type: "json_object" },
          });

          const analysisText = response.choices[0]?.message?.content || "{}";
          const analysis = JSON.parse(analysisText);

          return {
            videoId: video.id,
            hasFace: analysis.hasFace || false,
            hasText: analysis.hasText || false,
            dominantColors: Array.isArray(analysis.dominantColors) ? analysis.dominantColors : [],
            brightness: typeof analysis.brightness === "number" ? analysis.brightness : null,
          };
        } catch (error) {
          console.error(`Error analyzing thumbnail for video ${video.id}:`, error);
          return {
            videoId: video.id,
            hasFace: false,
            hasText: false,
            dominantColors: [],
            brightness: null,
          };
        }
      })
    );

    // Get or create analysis records
    const analyses = await Promise.all(
      videos.map(async (video: any) => {
        const titleAnalysis = titleAnalyses.find((a: any) => a.videoId === video.id);
        if (!titleAnalysis) return null;

        const thumbnailAnalysis = thumbnailAnalyses.find((a) => a.videoId === video.id);
        const viewCount = parseInt(video.statistics?.viewCount || "0", 10);
        const likeCount = parseInt(video.statistics?.likeCount || "0", 10);
        const commentCount = parseInt(video.statistics?.commentCount || "0", 10);
        const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;

        // Check if analysis exists
        const existing = await db.youTubeVideoAnalysis.findUnique({
          where: { videoId: video.id },
        });

        if (existing) {
          // Update with new thumbnail analysis if available
          if (thumbnailAnalysis) {
            return await db.youTubeVideoAnalysis.update({
              where: { videoId: video.id },
              data: {
                hasFace: thumbnailAnalysis.hasFace,
                hasText: thumbnailAnalysis.hasText,
                dominantColors: thumbnailAnalysis.dominantColors,
                brightness: thumbnailAnalysis.brightness,
                viewCount: viewCount.toString(),
                engagementRate,
              },
            });
          }
          return existing;
        }

        // Create new analysis
        return await db.youTubeVideoAnalysis.create({
          data: {
            videoId: video.id,
            titleLength: titleAnalysis.titleLength,
            hasQuestion: titleAnalysis.hasQuestion,
            hasBrackets: titleAnalysis.hasBrackets,
            hasNumber: titleAnalysis.hasNumber,
            wordCount: titleAnalysis.wordCount,
            topWords: titleAnalysis.topWords,
            hasFace: thumbnailAnalysis?.hasFace || false,
            hasText: thumbnailAnalysis?.hasText || false,
            dominantColors: thumbnailAnalysis?.dominantColors || [],
            brightness: thumbnailAnalysis?.brightness || null,
            viewCount: viewCount.toString(),
            engagementRate,
          },
        });
      })
    );

    return NextResponse.json({
      videos: videos.map((video: any, index: number) => ({
        id: video.id,
        title: video.snippet?.title,
        channelTitle: video.snippet?.channelTitle,
        thumbnail: video.snippet?.thumbnails?.high?.url,
        viewCount: video.statistics?.viewCount || "0",
        likeCount: video.statistics?.likeCount || "0",
        commentCount: video.statistics?.commentCount || "0",
        publishedAt: video.snippet?.publishedAt,
        analysis: analyses[index],
      })),
      aggregateAnalysis: {
        avgTitleLength: Math.round(avgTitleLength),
        percentWithBrackets: Math.round(percentWithBrackets),
        percentWithNumbers: Math.round(percentWithNumbers),
        percentWithQuestions: Math.round(percentWithQuestions),
        totalVideos: videos.length,
      },
    });
  } catch (error) {
    console.error("Error analyzing videos:", error);
    return NextResponse.json(
      { error: "Failed to analyze videos" },
      { status: 500 }
    );
  }
}
