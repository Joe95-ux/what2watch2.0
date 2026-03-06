import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import OpenAI from "openai";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb";
import { getJustWatchAvailability } from "@/lib/justwatch";
import { searchWeb, formatWebSearchResults } from "@/lib/web-search";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_FREE_QUESTIONS = 6;

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
    
    // Extract cast and crew information
    const credits = (contentDetails as any)?.credits;
    const cast = credits?.cast || [];
    const crew = credits?.crew || [];
    
    // Build cast information (top 10 cast members)
    let castInfo = "";
    if (cast.length > 0) {
      const topCast = cast.slice(0, 10).map((member: any) => {
        const character = member.character ? ` as ${member.character}` : "";
        return `- ${member.name}${character}`;
      }).join("\n");
      castInfo = `\n\nCAST:\n${topCast}`;
      if (cast.length > 10) {
        castInfo += `\n... and ${cast.length - 10} more cast members`;
      }
    }
    
    // Build crew information (key crew members: Director, Writer, Producer)
    let crewInfo = "";
    if (crew.length > 0) {
      const directors = crew.filter((member: any) => member.job === "Director").map((m: any) => m.name);
      const writers = crew.filter((member: any) => 
        member.job === "Writer" || member.job === "Screenplay" || member.job === "Author"
      ).map((m: any) => m.name);
      const producers = crew.filter((member: any) => 
        member.job === "Producer" || member.job === "Executive Producer"
      ).slice(0, 3).map((m: any) => m.name);
      
      const crewParts = [];
      if (directors.length > 0) {
        crewParts.push(`Director: ${directors.join(", ")}`);
      }
      if (writers.length > 0) {
        crewParts.push(`Writer: ${writers.slice(0, 3).join(", ")}${writers.length > 3 ? "..." : ""}`);
      }
      if (producers.length > 0) {
        crewParts.push(`Producer: ${producers.join(", ")}`);
      }
      
      if (crewParts.length > 0) {
        crewInfo = `\n\nCREW:\n${crewParts.join("\n")}`;
      }
    }

    // Build production companies info
    let productionInfo = "";
    const productionCompanies = (contentDetails as any)?.production_companies || [];
    if (productionCompanies.length > 0) {
      const companyNames = productionCompanies.slice(0, 5).map((company: any) => company.name).join(", ");
      productionInfo = `\n\nPRODUCTION COMPANIES:\n${companyNames}${productionCompanies.length > 5 ? `, and ${productionCompanies.length - 5} more` : ""}`;
    }
    
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

    // Determine if we need web search for current information
    // Check if the question asks about recent/current data or information that might need web search
    const messageLower = message.toLowerCase();
    const needsWebSearch = 
      // Financial/box office queries
      messageLower.includes("box office") ||
      messageLower.includes("revenue") ||
      messageLower.includes("gross") ||
      messageLower.includes("budget") ||
      messageLower.includes("cost") ||
      messageLower.includes("how much did") ||
      messageLower.includes("how much was") ||
      // Awards and recognition
      messageLower.includes("award") ||
      messageLower.includes("nomination") ||
      messageLower.includes("oscar") ||
      messageLower.includes("emmy") ||
      messageLower.includes("golden globe") ||
      // Reviews and ratings
      messageLower.includes("review") ||
      messageLower.includes("rating") ||
      messageLower.includes("critic") ||
      // Streaming and availability
      messageLower.includes("streaming") ||
      messageLower.includes("where to watch") ||
      messageLower.includes("available") ||
      // News and updates
      messageLower.includes("news") ||
      messageLower.includes("recent") ||
      messageLower.includes("latest") ||
      messageLower.includes("current") ||
      messageLower.includes("update") ||
      // Production information (might need current data)
      messageLower.includes("production compan") ||
      messageLower.includes("studio") ||
      messageLower.includes("distributor") ||
      messageLower.includes("who made") ||
      messageLower.includes("who produced") ||
      // Other queries that might need current data
      messageLower.includes("sequel") ||
      messageLower.includes("prequel") ||
      messageLower.includes("spin-off") ||
      messageLower.includes("franchise") ||
      // Recent releases might need web search for current information
      (releaseDate && new Date(releaseDate) > new Date("2023-10-01"));

    // Check if API key is configured (for debugging)
    const hasTavilyKey = !!process.env.TAVILY_API_KEY;
    const hasSerpKey = !!process.env.SERP_API_KEY;
    const hasGoogleKey = !!process.env.GOOGLE_SEARCH_API_KEY;
    console.log(`[AI Chat] Web search API keys status:`, {
      TAVILY_API_KEY: hasTavilyKey ? "✅ Set" : "❌ Not set",
      SERP_API_KEY: hasSerpKey ? "✅ Set" : "❌ Not set",
      GOOGLE_SEARCH_API_KEY: hasGoogleKey ? "✅ Set" : "❌ Not set",
    });

    // Perform web search if needed
    let webSearchInfo = "";
    if (needsWebSearch) {
      const searchQuery = `${title} ${mediaType === "movie" ? "movie" : "TV show"} ${message}`;
      console.log(`[AI Chat] ✅ Web search TRIGGERED for: "${searchQuery}"`);
      console.log(`[AI Chat] Message contains trigger keywords: "${message}"`);
      try {
        const searchResults = await searchWeb(searchQuery);
        console.log(`[AI Chat] Web search completed: ${searchResults.results.length} results from ${searchResults.provider}`);
        if (searchResults.results.length > 0) {
          webSearchInfo = formatWebSearchResults(searchResults);
          console.log(`[AI Chat] ✅ Web search info formatted and included in prompt (${webSearchInfo.length} chars)`);
        } else {
          console.log(`[AI Chat] ⚠️ No web search results found - API may have returned empty results`);
          console.log(`[AI Chat] Provider used: ${searchResults.provider}`);
        }
      } catch (error) {
        console.error(`[AI Chat] ❌ Web search error:`, error);
        console.error(`[AI Chat] Error details:`, error instanceof Error ? error.message : String(error));
        // Don't fail the entire request if web search fails
      }
    } else {
      console.log(`[AI Chat] ⏭️ Web search NOT triggered for message: "${message}"`);
      console.log(`[AI Chat] Message does not contain any trigger keywords`);
      console.log(`[AI Chat] Message lowercased: "${messageLower}"`);
    }

    // Debug: Log if web search info is being included
    if (webSearchInfo) {
      console.log(`[AI Chat] ✅ Web search info WILL be included in system prompt`);
      console.log(`[AI Chat] Web search info preview (first 200 chars):`, webSearchInfo.substring(0, 200));
    } else if (needsWebSearch) {
      console.log(`[AI Chat] ⚠️ Web search was triggered but no info to include (empty results or error)`);
    }

    const systemPrompt = `You are a helpful AI assistant specialized in providing information about movies and TV shows. You have access to detailed, up-to-date information about ${title} from The Movie Database (TMDB).

CONTEXT ABOUT ${title.toUpperCase()}:
- Type: ${mediaType === "movie" ? "Movie" : "TV Show"}
${releaseDate ? `- Release Date: ${releaseDate}` : ""}
${genres ? `- Genres: ${genres}` : ""}
${runtime ? `- Runtime: ${runtime} minutes` : ""}
${overview ? `- Overview: ${overview}` : ""}${castInfo}${crewInfo}${productionInfo}${watchInfo}${webSearchInfo}

INSTRUCTIONS:
1. Answer questions about ${title} accurately and helpfully using the provided information
2. When asked about cast members, use the CAST information provided above - this is current and accurate from TMDB
3. When asked about directors, writers, or producers, use the CREW information provided above
4. When asked about production companies or studios, use the PRODUCTION COMPANIES information provided above if available
5. If asked about where to watch, use the watch availability information provided
6. For current/recent information (box office, awards, reviews, streaming updates, news, production companies, budget, etc.):
   - **CRITICAL**: If "CURRENT WEB INFORMATION" is provided above, you MUST use it as your PRIMARY and ONLY source for answering the question
   - The web search results contain the most up-to-date, accurate information - ALWAYS prioritize these over your training data
   - If web search results are available, you MUST use them to answer the question, even if they differ from your knowledge
   - If web search results are provided, DO NOT say "the information is not available" - use the web search results instead
   - Only if NO web search results are provided should you use your knowledge (which extends to October 2023)
   - When using web search results, always cite the source URLs
7. Be conversational and friendly
8. If you don't know something specific that's not in the provided context or web search results, say so rather than guessing
9. Keep responses concise but informative
10. When using web search results, mention the sources (URLs) when relevant

Current date: ${new Date().toISOString().split("T")[0]}
Note: Cast and crew information is current from TMDB. ${webSearchInfo ? "Current web information has been fetched and provided above - use it as the primary source for recent data." : "For very recent information not in the provided context, web search may be needed."}`;

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
