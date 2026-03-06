import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import OpenAI from "openai";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb";
import { getJustWatchAvailability } from "@/lib/justwatch";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_FREE_QUESTIONS = 6;

// Web search function using OpenAI's web browsing capability
async function searchWeb(query: string): Promise<string> {
  try {
    // Use OpenAI's function calling with web search
    // Note: This requires GPT-4 with web browsing or a separate web search API
    // For now, we'll use a simple approach with OpenAI's knowledge
    // In production, you might want to use a dedicated web search API like SerpAPI, Google Custom Search, etc.
    
    // For MVP, we'll enhance the system prompt to indicate we want current information
    // and use GPT-4o which has knowledge up to Oct 2023
    return "";
  } catch (error) {
    console.error("Web search error:", error);
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, chatQuota: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { message, sessionId, tmdbId, mediaType, conversationHistory = [] } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!tmdbId || !mediaType) {
      return NextResponse.json({ error: "tmdbId and mediaType are required" }, { status: 400 });
    }

    // Check question count for free users
    const sessionKey = `movie-details-${tmdbId}-${sessionId || "default"}`;
    
    // Get or create session
    let session = await db.aiChatSession.findUnique({
      where: { sessionId: sessionKey },
    });

    if (!session) {
      // Create new session
      try {
        session = await db.aiChatSession.create({
          data: {
            userId: user.id,
            sessionId: sessionKey,
            mode: "movie-details",
            title: `Chat about ${mediaType === "movie" ? "movie" : "TV show"}`,
            messages: [],
            metadata: {
              tmdbId,
              mediaType,
              questionCount: 0,
            },
          },
        });
      } catch (error) {
        // If creation fails (e.g., duplicate key), try to find it again
        session = await db.aiChatSession.findUnique({
          where: { sessionId: sessionKey },
        });
        if (!session) {
          throw error;
        }
      }
    }

    const sessionMetadata = (session.metadata as any) || {};

    // Count total questions asked by user (using AiChatEvent for accurate count)
    const totalQuestionCount = await db.aiChatEvent.count({
      where: { userId: user.id },
    });

    // Determine user's quota limit
    // null = default (6), -1 = unlimited, number = custom limit
    let maxQuestions: number;
    if (user.chatQuota === null) {
      maxQuestions = MAX_FREE_QUESTIONS; // Default limit
    } else if (user.chatQuota === -1) {
      maxQuestions = -1; // Unlimited
    } else {
      maxQuestions = user.chatQuota; // Custom limit set by admin
    }

    // Check if user has exceeded their limit (skip check if unlimited)
    if (maxQuestions !== -1 && totalQuestionCount >= maxQuestions) {
      return NextResponse.json(
        {
          error: "QUESTION_LIMIT_REACHED",
          message: `You've reached your limit of ${maxQuestions} questions. Upgrade to Pro for unlimited questions.`,
          questionCount: totalQuestionCount,
          maxQuestions,
        },
        { status: 403 }
      );
    }

    // Fetch movie/TV details for context
    let contentDetails: any = null;
    let watchAvailability: any = null;

    try {
      if (mediaType === "movie") {
        contentDetails = await getMovieDetails(tmdbId);
      } else {
        contentDetails = await getTVDetails(tmdbId);
      }

      // Fetch watch availability
      try {
        watchAvailability = await getJustWatchAvailability(mediaType, tmdbId, "US");
      } catch (error) {
        console.error("Failed to fetch watch availability:", error);
      }
    } catch (error) {
      console.error("Failed to fetch content details:", error);
    }

    // Build system prompt with movie context
    const title = mediaType === "movie" 
      ? contentDetails?.title || "this movie"
      : contentDetails?.name || "this TV show";
    
    const releaseDate = mediaType === "movie"
      ? contentDetails?.release_date
      : contentDetails?.first_air_date;
    
    const overview = contentDetails?.overview || "";
    const genres = contentDetails?.genres?.map((g: any) => g.name).join(", ") || "";
    const runtime = mediaType === "movie"
      ? contentDetails?.runtime
      : contentDetails?.episode_run_time?.[0];
    
    // Build watch availability info
    let watchInfo = "";
    if (watchAvailability) {
      const providers = watchAvailability.offersByType || {};
      const streaming = providers.flatrate || [];
      const buy = providers.buy || [];
      const rent = providers.rent || [];
      const free = providers.free || [];
      
      if (streaming.length > 0 || buy.length > 0 || rent.length > 0 || free.length > 0) {
        watchInfo = "\n\nWHERE TO WATCH:\n";
        if (streaming.length > 0) {
          watchInfo += `Streaming: ${streaming.slice(0, 5).map((p: any) => p.providerName).join(", ")}\n`;
        }
        if (buy.length > 0) {
          watchInfo += `Buy: ${buy.slice(0, 3).map((p: any) => p.providerName).join(", ")}\n`;
        }
        if (rent.length > 0) {
          watchInfo += `Rent: ${rent.slice(0, 3).map((p: any) => p.providerName).join(", ")}\n`;
        }
        if (free.length > 0) {
          watchInfo += `Free: ${free.slice(0, 3).map((p: any) => p.providerName).join(", ")}\n`;
        }
      }
    }

    const systemPrompt = `You are a helpful AI assistant specialized in providing information about movies and TV shows. You have access to detailed information about ${title}.

CONTEXT ABOUT ${title.toUpperCase()}:
- Type: ${mediaType === "movie" ? "Movie" : "TV Show"}
${releaseDate ? `- Release Date: ${releaseDate}` : ""}
${genres ? `- Genres: ${genres}` : ""}
${runtime ? `- Runtime: ${runtime} minutes` : ""}
${overview ? `- Overview: ${overview}` : ""}${watchInfo}

INSTRUCTIONS:
1. Answer questions about ${title} accurately and helpfully
2. If asked about where to watch, use the watch availability information provided
3. For current/recent information (box office numbers, recent news, streaming updates, awards, etc.):
   - Use your knowledge which extends to October 2023
   - For information after October 2023, acknowledge the limitation and provide what you know
   - If asked about very recent events (last few months), suggest checking official sources
4. Be conversational and friendly
5. If you don't know something specific, say so rather than guessing
6. Keep responses concise but informative

Current date: ${new Date().toISOString().split("T")[0]}
Note: Your knowledge is current up to October 2023. For information after that date, acknowledge potential limitations.`;

    // Prepare conversation history
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      { role: "assistant", content: systemPrompt },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: "user", content: message },
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Use GPT-4o for better knowledge and reasoning
      messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    // Update session with new messages
    const updatedMessages = [
      ...(Array.isArray(session.messages) ? session.messages : []),
      { role: "user" as const, content: message },
      { role: "assistant" as const, content: aiResponse },
    ];

    await db.aiChatSession.update({
      where: { id: session.id },
      data: {
        messages: updatedMessages,
        metadata: {
          ...sessionMetadata,
          questionCount: (sessionMetadata.questionCount || 0) + 1,
        },
        updatedAt: new Date(),
      },
    });

    // Log the event
    try {
      await db.aiChatEvent.create({
        data: {
          userId: user.id,
          sessionId: sessionKey,
          userMessage: message,
          intent: "INFORMATION" as any,
          aiResponse,
          responseTime: Date.now(),
          model: "gpt-4o",
          promptTokens: completion.usage?.prompt_tokens ?? null,
          completionTokens: completion.usage?.completion_tokens ?? null,
          totalTokens: completion.usage?.total_tokens ?? null,
          resultsCount: 0,
          resultIds: [],
          resultTypes: [],
        },
      });
    } catch (dbError) {
      console.error("Failed to log AI chat event:", dbError);
    }

    return NextResponse.json({
      message: aiResponse,
      questionCount: totalQuestionCount + 1, // +1 because we're about to create the event
      maxQuestions,
    });
  } catch (error) {
    console.error("Movie details chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}

// GET - Fetch chat history for a movie
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, chatQuota: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Count total questions asked by user
    const totalQuestionCount = await db.aiChatEvent.count({
      where: { userId: user.id },
    });

    // Determine user's quota limit
    let maxQuestions: number;
    if (user.chatQuota === null) {
      maxQuestions = MAX_FREE_QUESTIONS; // Default limit
    } else if (user.chatQuota === -1) {
      maxQuestions = -1; // Unlimited
    } else {
      maxQuestions = user.chatQuota; // Custom limit set by admin
    }

    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get("tmdbId");
    const sessionId = searchParams.get("sessionId") || "default";

    if (!tmdbId) {
      return NextResponse.json({ error: "tmdbId is required" }, { status: 400 });
    }

    const sessionKey = `movie-details-${tmdbId}-${sessionId}`;
    
    const session = await db.aiChatSession.findUnique({
      where: { sessionId: sessionKey },
    });

    if (!session) {
      return NextResponse.json({ messages: [], questionCount: totalQuestionCount, maxQuestions });
    }

    const metadata = (session.metadata as any) || {};
    const messages = Array.isArray(session.messages) ? session.messages : [];

    return NextResponse.json({
      messages,
      questionCount: totalQuestionCount,
      maxQuestions,
    });
  } catch (error) {
    console.error("Get chat history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}
