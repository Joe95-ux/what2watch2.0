import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import OpenAI from "openai";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

/**
 * Classify video format using AI
 * POST /api/youtube/formats/classify
 * Body: { videoIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { videoIds } = body;

    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json(
        { error: "videoIds array is required" },
        { status: 400 }
      );
    }

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    if (!openai) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Fetch video details from YouTube API
    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("part", "snippet,statistics");
    videosUrl.searchParams.set("id", videoIds.join(","));
    videosUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const videosResponse = await fetch(videosUrl.toString(), {
      next: { revalidate: 3600 },
    });

    if (!videosResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch videos from YouTube API" },
        { status: videosResponse.status }
      );
    }

    const videosData = await videosResponse.json();
    const videos = videosData.items || [];

    // Classify each video format using AI
    const classifications = await Promise.all(
      videos.map(async (video: any) => {
        const videoId = video.id;
        const title = video.snippet?.title || "";
        const description = video.snippet?.description || "";
        const thumbnailUrl = video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url;

        // Check if already classified
        const existing = await db.videoFormat.findUnique({
          where: { videoId },
        });

        if (existing) {
          return {
            videoId,
            format: existing.format,
            confidence: existing.confidence,
            fromCache: true,
          };
        }

        try {
          // Use AI to classify format based on title, description, and thumbnail
          const prompt = `Analyze this YouTube video and classify its format. 

Title: ${title}
Description: ${description ? description.substring(0, 500) : "No description"}

Classify into ONE of these formats:
- tutorial: Step-by-step instructional content
- list: Top 10, rankings, lists
- review: Product/service reviews, comparisons
- vlog: Personal daily life, behind-the-scenes
- rant: Opinion pieces, controversial takes
- documentary: Deep-dive, educational, investigative
- reaction: Reacting to other content
- challenge: Challenges, experiments, tests

Respond with JSON only: {"format": "format_name", "confidence": 0.0-1.0, "reasoning": "brief explanation"}`;

          const messages: any[] = [
            {
              role: "user",
              content: prompt,
            },
          ];

          // Add thumbnail if available
          if (thumbnailUrl) {
            messages[0].content = [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: { url: thumbnailUrl },
              },
            ];
          }

          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages,
            max_tokens: 150,
            response_format: { type: "json_object" },
          });

          const analysisText = response.choices[0]?.message?.content || "{}";
          const analysis = JSON.parse(analysisText);

          const format = analysis.format || "general";
          const confidence = typeof analysis.confidence === "number" ? analysis.confidence : 0.7;

          // Determine category from title/description
          const category = determineCategory(title, description);

          // Store classification
          await db.videoFormat.upsert({
            where: { videoId },
            create: {
              videoId,
              format,
              confidence,
              category,
            },
            update: {
              format,
              confidence,
              category,
            },
          });

          return {
            videoId,
            format,
            confidence,
            category,
            fromCache: false,
          };
        } catch (error) {
          console.error(`Error classifying video ${videoId}:`, error);
          return {
            videoId,
            format: "general",
            confidence: 0,
            fromCache: false,
            error: "Classification failed",
          };
        }
      })
    );

    return NextResponse.json({
      classifications,
      total: classifications.length,
    });
  } catch (error) {
    console.error("Error in format classification:", error);
    return NextResponse.json(
      { error: "Failed to classify video formats" },
      { status: 500 }
    );
  }
}

function determineCategory(title: string, description: string): string | null {
  const text = `${title} ${description}`.toLowerCase();
  
  const categories = [
    { keywords: ["tech", "technology", "gadget", "software", "app", "iphone", "android"], name: "tech" },
    { keywords: ["gaming", "game", "play", "stream", "twitch"], name: "gaming" },
    { keywords: ["fitness", "workout", "exercise", "gym", "health"], name: "fitness" },
    { keywords: ["cooking", "recipe", "food", "kitchen", "baking"], name: "food" },
    { keywords: ["travel", "trip", "vacation", "destination"], name: "travel" },
    { keywords: ["beauty", "makeup", "skincare", "cosmetic"], name: "beauty" },
    { keywords: ["education", "learn", "study", "course", "tutorial"], name: "education" },
    { keywords: ["entertainment", "funny", "comedy", "meme"], name: "entertainment" },
  ];

  for (const cat of categories) {
    if (cat.keywords.some(keyword => text.includes(keyword))) {
      return cat.name;
    }
  }

  return null;
}
