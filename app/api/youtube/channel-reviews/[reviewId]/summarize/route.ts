import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    // Allow internal calls (from server-side) without auth
    const { userId: clerkUserId } = await auth();
    const authHeader = request.headers.get("authorization");
    const isInternalCall = authHeader === `Bearer ${process.env.INTERNAL_API_SECRET || "internal-secret"}`;

    if (!clerkUserId && !isInternalCall) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewId } = await params;

    const review = await db.channelReview.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        content: true,
        title: true,
        userId: true,
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Verify ownership only if not internal call
    if (!isInternalCall) {
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });

      if (!user || user.id !== review.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Generate summary tags using OpenAI
    const reviewText = review.title ? `${review.title}\n\n${review.content}` : review.content;

    const prompt = `Summarize this YouTube channel review in exactly 2-4 single words (adjectives or descriptive terms), separated by spaces. Examples: "funny inspiration friendly" or "educational informative helpful". Return only the words, nothing else. No punctuation, no explanations, just the words separated by spaces.

Review:
${reviewText}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that summarizes reviews in 2-4 descriptive words.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 20,
      });

      const aiResponse = completion.choices[0]?.message?.content?.trim() || "";
      
      // Parse the response into an array of tags
      const summaryTags = aiResponse
        .split(/\s+/)
        .filter((word) => word.length > 0)
        .slice(0, 4) // Limit to 4 words max
        .map((word) => word.toLowerCase().trim());

      if (summaryTags.length === 0) {
        return NextResponse.json(
          { error: "Failed to generate summary tags" },
          { status: 500 }
        );
      }

      // Update the review with summary tags
      await db.channelReview.update({
        where: { id: reviewId },
        data: { summaryTags },
      });

      return NextResponse.json({ summaryTags });
    } catch (openaiError) {
      console.error("[ReviewSummarize] OpenAI error:", openaiError);
      return NextResponse.json(
        { error: "Failed to generate summary tags" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[ReviewSummarize] Error:", error);
    return NextResponse.json(
      { error: "Failed to summarize review" },
      { status: 500 }
    );
  }
}

