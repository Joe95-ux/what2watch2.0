import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { AiChatIntent } from "@prisma/client";
import OpenAI from "openai";
import { searchMovies, searchTV, discoverMovies, discoverTV, TMDBMovie, TMDBSeries } from "@/lib/tmdb";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ExtractedParams {
  intent: "RECOMMENDATION" | "INFORMATION";
  query?: string;
  genres?: number[];
  year?: number;
  type?: "movie" | "tv" | "all";
  keywords?: string[];
  title?: string; // For information queries
  count?: number; // Exact number of results requested
}

const SYSTEM_PROMPT_RECOMMENDATION = `You are a helpful AI assistant specialized in movies and TV shows. Your job is to understand user queries and extract search parameters for recommendations.

When a user asks for recommendations (e.g., "I want something scary", "Show me 8 action movies from the 90s"), extract:
- intent: "RECOMMENDATION"
- genres: array of genre IDs (use TMDB genre IDs: Action=28, Comedy=35, Drama=18, Horror=27, Romance=10749, Sci-Fi=878, Thriller=53, etc.)
- year: if mentioned
- type: "movie", "tv", or "all" if specified
- keywords: important descriptive words
- count: exact number if user specifies (e.g., "8 movies" = 8, "show me 5" = 5)

Always respond with valid JSON in this format:
{
  "intent": "RECOMMENDATION",
  "query": "search query if needed",
  "genres": [28, 35],
  "year": 2010,
  "type": "movie" | "tv" | "all",
  "keywords": ["scary", "thriller"],
  "count": 8
}

Only include fields that are relevant.`;

const SYSTEM_PROMPT_INFORMATION = `You are a helpful AI assistant specialized in movies and TV shows. Answer user questions about movies, TV shows, actors, directors, and entertainment industry facts. Use your knowledge and available information to provide accurate, detailed answers. 

Note: You have access to a knowledge base that includes information up to your training cutoff date. For questions about recent releases, box office numbers, or current industry events, provide the best answer based on your knowledge and reasoning, but acknowledge if the information might be outdated.`;

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { message, sessionId, conversationHistory = [], mode = "recommendation" } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const startTime = Date.now();

    // Handle INFORMATION mode differently - direct conversation with GPT-4o
    if (mode === "information") {
      const messages: ChatMessage[] = [
        { role: "assistant", content: SYSTEM_PROMPT_INFORMATION },
        ...conversationHistory.slice(-20), // Keep last 20 messages for context
        { role: "user", content: message },
      ];

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o", // Use GPT-4o for information queries
          messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          temperature: 0.7,
          max_tokens: 1000,
        });

        const aiResponseText = completion.choices[0]?.message?.content || "";
        const responseTime = Date.now() - startTime;

        // Log the event
        try {
          await db.aiChatEvent.create({
            data: {
              userId: user.id,
              sessionId: sessionId || `session-${Date.now()}`,
              userMessage: message,
              intent: AiChatIntent.INFORMATION,
              aiResponse: aiResponseText,
              responseTime,
              resultsCount: 0,
              resultIds: [],
              resultTypes: [],
            },
          });
        } catch (dbError) {
          console.error("Failed to log AI chat event:", dbError);
        }

        return NextResponse.json({
          intent: "INFORMATION",
          message: aiResponseText,
          results: [],
          metadata: {},
        });
      } catch (error) {
        console.error("OpenAI error:", error);
        return NextResponse.json(
          { error: "Failed to process information query" },
          { status: 500 }
        );
      }
    }

    // RECOMMENDATION mode - extract parameters and search TMDB
    // Prepare conversation history for OpenAI
    const messages: ChatMessage[] = [
      { role: "assistant", content: SYSTEM_PROMPT_RECOMMENDATION },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: "user", content: message },
    ];

    // Call OpenAI to extract parameters
    let extractedParams: ExtractedParams;
    let aiResponseText = "";

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using cheaper model for cost efficiency
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      aiResponseText = completion.choices[0]?.message?.content || "";
      const parsed = JSON.parse(aiResponseText);
      extractedParams = {
        intent: "RECOMMENDATION",
        query: parsed.query,
        genres: parsed.genres || [],
        year: parsed.year,
        type: parsed.type || "all",
        keywords: parsed.keywords || [],
        count: parsed.count,
      };
    } catch (openaiError) {
      console.error("OpenAI error:", openaiError);
      // Fallback: try to extract basic info
      extractedParams = {
        intent: "RECOMMENDATION",
        query: message,
        type: "all",
      };
    }

    const responseTime = Date.now() - startTime;

    // Fetch results for RECOMMENDATION mode
    let results: (TMDBMovie | TMDBSeries)[] = [];
    let resultIds: number[] = [];
    let resultTypes: string[] = [];

    // RECOMMENDATION: Use discover API with extracted parameters
    const type = extractedParams.type || "all";
    const genres = extractedParams.genres || [];
    const year = extractedParams.year;

    if (genres.length > 0 || year) {
        // Use discover with filters
        const discoverPromises: Promise<{ results: (TMDBMovie | TMDBSeries)[] }>[] = [];

        if (type === "movie" || type === "all") {
          discoverPromises.push(
            discoverMovies({
              page: 1,
              genre: genres.length > 0 ? genres : undefined,
              year,
              sortBy: "popularity.desc",
            }).then((r) => ({ results: r.results }))
          );
        }

        if (type === "tv" || type === "all") {
          discoverPromises.push(
            discoverTV({
              page: 1,
              genre: genres.length > 0 ? genres : undefined,
              year,
              sortBy: "popularity.desc",
            }).then((r) => ({ results: r.results }))
          );
        }

        const discoverResults = await Promise.all(discoverPromises);
        const combined = discoverResults.flatMap((r) => r.results);
        
        // Deduplicate by ID and limit to requested count
        const seen = new Set<number>();
        const maxResults = extractedParams.count || 20;
        results = combined.filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        }).slice(0, maxResults);

        resultIds = results.map((r) => r.id);
        resultTypes = results.map((r) => ("title" in r ? "movie" : "tv"));
      } else if (extractedParams.query) {
        // Fallback to search if no filters
        const [movieResults, tvResults] = await Promise.all([
          searchMovies(extractedParams.query, 1),
          searchTV(extractedParams.query, 1),
        ]);

        const combined = [
          ...movieResults.results.slice(0, 10),
          ...tvResults.results.slice(0, 10),
        ];

        const seen = new Set<number>();
        const maxResults = extractedParams.count || 20;
        results = combined.filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        }).slice(0, maxResults);

        resultIds = results.map((r) => r.id);
        resultTypes = results.map((r) => ("title" in r ? "movie" : "tv"));
      }

    // Log the event
    try {
      await db.aiChatEvent.create({
        data: {
          userId: user.id,
          sessionId: sessionId || `session-${Date.now()}`,
          userMessage: message,
          intent: extractedParams.intent === "INFORMATION" ? AiChatIntent.INFORMATION : AiChatIntent.RECOMMENDATION,
          aiResponse: aiResponseText || "No response",
          responseTime,
          resultsCount: results.length,
          resultIds,
          resultTypes,
          extractedGenres: extractedParams.genres || [],
          extractedKeywords: extractedParams.keywords || [],
          extractedYear: extractedParams.year || null,
          extractedType: extractedParams.type || null,
        },
      });
    } catch (dbError) {
      console.error("Failed to log AI chat event:", dbError);
      // Don't fail the request if logging fails
    }

    // Generate natural language response for RECOMMENDATION mode
    let responseMessage = "";
    if (results.length > 0) {
      const count = extractedParams.count ? ` ${extractedParams.count}` : "";
      const type = extractedParams.type === "movie" ? "movies" : extractedParams.type === "tv" ? "TV shows" : "titles";
      responseMessage = `Found${count} ${type} matching your preferences.`;
    } else {
      responseMessage = "I couldn't find any matches. Try adjusting your criteria or be more specific.";
    }

    return NextResponse.json({
      intent: extractedParams.intent,
      message: responseMessage,
      results,
      metadata: {
        genres: extractedParams.genres,
        year: extractedParams.year,
        type: extractedParams.type,
        keywords: extractedParams.keywords,
      },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}

