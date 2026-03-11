import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { lastMessage, lastResponse, title, mediaType } = body;

    if (!lastMessage || !lastResponse || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prompt = `Based on this conversation about ${title} (${mediaType === "movie" ? "movie" : "TV show"}):

User asked: "${lastMessage}"
AI responded: "${lastResponse}"

Generate 3 concise, relevant follow-up questions that a user might want to ask next. Each question should be:
- Short (max 8 words)
- Directly related to the conversation
- Natural and conversational
- About ${title} or related topics

Return ONLY a JSON array of 3 strings, no other text. Example format: ["Question 1?", "Question 2?", "Question 3?"]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 150,
    });

    const response = completion.choices[0]?.message?.content || "";
    
    // Try to parse JSON array
    let suggestions: string[] = [];
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        suggestions = parsed.slice(0, 3).filter((s: any) => typeof s === "string" && s.length > 0);
      }
    } catch (e) {
      // Fallback: extract questions from text
      const lines = response.split('\n').filter(line => line.trim().length > 0);
      suggestions = lines
        .slice(0, 3)
        .map(line => line.replace(/^[-*•]\s*/, '').replace(/^"\s*|"\s*$/g, '').trim())
        .filter(s => s.length > 0);
    }

    // Ensure we have at least 3 suggestions, use fallbacks if needed
    const fallbacks = [
      "Tell me more about the cast",
      "What are the reviews like?",
      "Where can I watch this?",
    ];

    while (suggestions.length < 3) {
      suggestions.push(fallbacks[suggestions.length] || `Tell me more about ${title}`);
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 3) });
  } catch (error) {
    console.error("Suggestions generation error:", error);
    // Return fallback suggestions on error
    return NextResponse.json({
      suggestions: [
        "Tell me more about the cast",
        "What are the reviews like?",
        "Where can I watch this?",
      ],
    });
  }
}
