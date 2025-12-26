import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;

    // Fetch all published reviews for the channel
    const reviews = await db.channelReview.findMany({
      where: {
        channelId,
        status: "published",
      },
      select: {
        content: true,
        title: true,
        summaryTags: true,
      },
      take: 50, // Limit to 50 reviews to avoid token limits
    });

    if (reviews.length === 0) {
      return NextResponse.json({ summary: null });
    }

    // Use existing summaryTags if available, otherwise use content
    const reviewTexts = reviews.map((review) => {
      if (review.summaryTags && review.summaryTags.length > 0) {
        return review.summaryTags.join(" ");
      }
      return review.title ? `${review.title} ${review.content}` : review.content;
    });

    const combinedText = reviewTexts.join("\n\n");

    const prompt = `Based on these YouTube channel reviews, generate a 2-4 word summary that captures the overall sentiment and key themes. Examples: "educational inspiring helpful" or "entertaining funny creative". Return only the words, separated by spaces. No punctuation, no explanations, just the words.

Reviews:
${combinedText}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that summarizes multiple reviews into 2-4 descriptive words.",
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
      const summary = aiResponse
        .split(/\s+/)
        .filter((word) => word.length > 0)
        .slice(0, 4) // Limit to 4 words max
        .map((word) => word.toLowerCase().trim())
        .join(" ");

      if (!summary) {
        return NextResponse.json({ summary: null });
      }

      return NextResponse.json({ summary });
    } catch (openaiError) {
      console.error("[ChannelSummary] OpenAI error:", openaiError);
      return NextResponse.json({ summary: null });
    }
  } catch (error) {
    console.error("[ChannelSummary] Error:", error);
    return NextResponse.json({ summary: null });
  }
}

