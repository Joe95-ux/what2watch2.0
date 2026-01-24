import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import OpenAI from "openai";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

/**
 * Extract questions from video comments
 * POST /api/youtube/comments/extract-questions
 * Body: { videoId: string, maxComments?: number }
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

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { videoId, maxComments = 100 } = body;

    if (!videoId) {
      return NextResponse.json(
        { error: "videoId is required" },
        { status: 400 }
      );
    }

    // Get video details to get channel ID
    const videoUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videoUrl.searchParams.set("part", "snippet");
    videoUrl.searchParams.set("id", videoId);
    videoUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const videoResponse = await fetch(videoUrl.toString(), {
      next: { revalidate: 3600 },
    });

    if (!videoResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch video details" },
        { status: videoResponse.status }
      );
    }

    const videoData = await videoResponse.json();
    const video = videoData.items?.[0];

    if (!video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    const channelId = video.snippet?.channelId;

    // Fetch comments
    const commentsUrl = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
    commentsUrl.searchParams.set("part", "snippet,replies");
    commentsUrl.searchParams.set("videoId", videoId);
    commentsUrl.searchParams.set("maxResults", Math.min(maxComments, 100).toString());
    commentsUrl.searchParams.set("order", "relevance"); // Get most relevant comments
    commentsUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const commentsResponse = await fetch(commentsUrl.toString(), {
      next: { revalidate: 300 },
    });

    if (!commentsResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: commentsResponse.status }
      );
    }

    const commentsData = await commentsResponse.json();
    const comments = commentsData.items || [];

    if (comments.length === 0) {
      return NextResponse.json({
        questions: [],
        message: "No comments found for this video",
      });
    }

    // Extract questions from comments
    const questions: Array<{
      question: string;
      questionType: string | null;
      upvotes: number;
      replies: number;
    }> = [];

    for (const commentThread of comments) {
      const topLevelComment = commentThread.snippet?.topLevelComment?.snippet;
      if (!topLevelComment) continue;

      const text = topLevelComment.textDisplay || topLevelComment.textOriginal || "";
      const upvotes = topLevelComment.likeCount || 0;
      const replies = commentThread.snippet?.totalReplyCount || 0;

      // Check if comment is a question
      const isQuestion = detectQuestion(text);

      if (isQuestion.isQuestion) {
        questions.push({
          question: text.substring(0, 500), // Limit length
          questionType: isQuestion.type,
          upvotes,
          replies,
        });
      }

      // Also check replies for questions
      if (commentThread.replies?.comments) {
        for (const reply of commentThread.replies.comments) {
          const replyText = reply.snippet?.textDisplay || reply.snippet?.textOriginal || "";
          const replyUpvotes = reply.snippet?.likeCount || 0;
          const replyIsQuestion = detectQuestion(replyText);

          if (replyIsQuestion.isQuestion) {
            questions.push({
              question: replyText.substring(0, 500),
              questionType: replyIsQuestion.type,
              upvotes: replyUpvotes,
              replies: 0,
            });
          }
        }
      }
    }

    // Store questions in database
    const savedQuestions = await Promise.all(
      questions.map((q) =>
        db.commentQuestion.create({
          data: {
            videoId,
            channelId,
            question: q.question,
            questionType: q.questionType,
            upvotes: q.upvotes,
            replies: q.replies,
          },
        })
      )
    );

    return NextResponse.json({
      questions: savedQuestions,
      total: savedQuestions.length,
      videoId,
      channelId,
    });
  } catch (error) {
    console.error("Error extracting questions from comments:", error);
    return NextResponse.json(
      { error: "Failed to extract questions from comments" },
      { status: 500 }
    );
  }
}

function detectQuestion(text: string): { isQuestion: boolean; type: string | null } {
  const trimmed = text.trim();
  
  // Must end with question mark
  if (!trimmed.endsWith("?")) {
    return { isQuestion: false, type: null };
  }

  // Remove question mark and check for question words
  const lowerText = trimmed.toLowerCase().replace(/[?!.]/g, "");

  // Question type detection
  if (lowerText.startsWith("how")) {
    return { isQuestion: true, type: "how" };
  }
  if (lowerText.startsWith("what")) {
    return { isQuestion: true, type: "what" };
  }
  if (lowerText.startsWith("why")) {
    return { isQuestion: true, type: "why" };
  }
  if (lowerText.startsWith("when")) {
    return { isQuestion: true, type: "when" };
  }
  if (lowerText.startsWith("where")) {
    return { isQuestion: true, type: "where" };
  }
  if (lowerText.startsWith("who")) {
    return { isQuestion: true, type: "who" };
  }

  // Check for question patterns
  const questionPatterns = [
    /\bis\s+(there|this|that|it)\s+/i,
    /\bcan\s+(you|i|we|they)\s+/i,
    /\bshould\s+(you|i|we|they)\s+/i,
    /\bdo\s+(you|i|we|they)\s+/i,
    /\bdoes\s+(it|this|that|he|she)\s+/i,
    /\bwill\s+(you|i|we|they|it)\s+/i,
    /\bwould\s+(you|i|we|they)\s+/i,
    /\bcould\s+(you|i|we|they)\s+/i,
  ];

  for (const pattern of questionPatterns) {
    if (pattern.test(lowerText)) {
      return { isQuestion: true, type: "general" };
    }
  }

  // If it ends with ? and has reasonable length, consider it a question
  if (trimmed.length > 10 && trimmed.length < 500) {
    return { isQuestion: true, type: "general" };
  }

  return { isQuestion: false, type: null };
}
