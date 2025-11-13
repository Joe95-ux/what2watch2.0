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

const SYSTEM_PROMPT = `You are a helpful AI assistant specialized in movies and TV shows. Your job is to understand user queries and extract search parameters.

When a user asks for recommendations (e.g., "I want something scary", "Show me 8 action movies from the 90s"), extract:
- intent: "RECOMMENDATION"
- genres: array of genre IDs (use TMDB genre IDs: Action=28, Comedy=35, Drama=18, Horror=27, Romance=10749, Sci-Fi=878, Thriller=53, etc.)
- year: if mentioned
- type: "movie", "tv", or "all" if specified
- keywords: important descriptive words
- count: exact number if user specifies (e.g., "8 movies" = 8, "show me 5" = 5)

When a user asks for information about a specific title (e.g., "Tell me about Inception", "What's the plot of Breaking Bad?"), extract:
- intent: "INFORMATION"
- title: the movie/TV show name
- query: the title for searching

Always respond with valid JSON in this format:
{
  "intent": "RECOMMENDATION" | "INFORMATION",
  "query": "search query if needed",
  "genres": [28, 35],
  "year": 2010,
  "type": "movie" | "tv" | "all",
  "keywords": ["scary", "thriller"],
  "title": "Inception",
  "count": 8
}

Only include fields that are relevant.`;

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
    const { message, sessionId, conversationHistory = [] } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const startTime = Date.now();

    // Prepare conversation history for OpenAI
    const messages: ChatMessage[] = [
      { role: "assistant", content: SYSTEM_PROMPT },
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
        intent: parsed.intent === "INFORMATION" ? "INFORMATION" : "RECOMMENDATION",
        query: parsed.query,
        genres: parsed.genres || [],
        year: parsed.year,
        type: parsed.type || "all",
        keywords: parsed.keywords || [],
        title: parsed.title,
        count: parsed.count,
      };
    } catch (openaiError) {
      console.error("OpenAI error:", openaiError);
      // Fallback: try to extract basic info
      extractedParams = {
        intent: message.toLowerCase().includes("tell me about") || message.toLowerCase().includes("what is") || message.toLowerCase().includes("info about")
          ? "INFORMATION"
          : "RECOMMENDATION",
        query: message,
        type: "all",
      };
    }

    const responseTime = Date.now() - startTime;

    // Fetch results based on intent
    let results: (TMDBMovie | TMDBSeries)[] = [];
    let resultIds: number[] = [];
    let resultTypes: string[] = [];

    if (extractedParams.intent === "INFORMATION") {
      // Search for specific title
      const searchQuery = extractedParams.title || extractedParams.query || message;
      const [movieResults, tvResults] = await Promise.all([
        searchMovies(searchQuery, 1),
        searchTV(searchQuery, 1),
      ]);

      // Combine and take top 5 most relevant
      const combined = [
        ...movieResults.results.slice(0, 3).map((m) => ({ ...m, _type: "movie" as const })),
        ...tvResults.results.slice(0, 3).map((t) => ({ ...t, _type: "tv" as const })),
      ];

      results = combined.slice(0, 5) as (TMDBMovie | TMDBSeries)[];
      resultIds = results.map((r) => r.id);
      resultTypes = combined.slice(0, 5).map((r) => r._type);
    } else {
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

    // Generate natural language response
    let responseMessage = "";
    if (extractedParams.intent === "INFORMATION") {
      if (results.length > 0) {
        const firstResult = results[0];
        const title = "title" in firstResult ? firstResult.title : firstResult.name;
        responseMessage = `Here's information about "${title}".`;
      } else {
        responseMessage = "I couldn't find that title. Could you try a different search?";
      }
    } else {
      // RECOMMENDATION mode
      if (results.length > 0) {
        const count = extractedParams.count ? ` ${extractedParams.count}` : "";
        const type = extractedParams.type === "movie" ? "movies" : extractedParams.type === "tv" ? "TV shows" : "titles";
        responseMessage = `Found${count} ${type} matching your preferences.`;
      } else {
        responseMessage = "I couldn't find any matches. Try adjusting your criteria or be more specific.";
      }
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

