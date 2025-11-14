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

const SYSTEM_PROMPT_RECOMMENDATION = `You are a precise AI assistant specialized in movies and TV shows. Your job is to accurately extract search parameters from user queries for movie/TV show recommendations.

EXTRACTION RULES:
1. QUERY field: Use for:
   - Actor/actress names (e.g., "Tom Cruise", "Meryl Streep")
   - Director names (e.g., "Christopher Nolan", "Quentin Tarantino")
   - Movie/TV show titles (e.g., "The Matrix", "Breaking Bad")
   - Character names if searching for specific roles
   - Extract ONLY the name/title, not descriptive words

2. GENRES field: Use ONLY when user explicitly mentions a genre:
   - Action=28, Adventure=12, Animation=16, Comedy=35, Crime=80, Documentary=99, Drama=18, Family=10751, Fantasy=14, History=36, Horror=27, Music=10402, Mystery=9648, Romance=10749, Sci-Fi=878, Thriller=53, War=10752, Western=37
   - TV genres: Action & Adventure=10759, Animation=16, Comedy=35, Crime=80, Documentary=99, Drama=18, Family=10751, Kids=10762, Mystery=9648, News=10763, Reality=10764, Sci-Fi & Fantasy=10765, Soap=10766, Talk=10767, War & Politics=10768, Western=37

3. YEAR field: Extract if user mentions a specific year or decade (e.g., "90s" = 1990, "2020s" = 2020)

4. TYPE field: 
   - "movie" if user says "movies", "film", "cinema"
   - "tv" if user says "TV shows", "series", "television"
   - "all" if not specified or user says "movies and TV shows"

5. COUNT field: Extract exact number if specified (e.g., "10 movies" = 10, "show me 5" = 5, "a few" = 5, "several" = 8)

6. KEYWORDS field: Use for descriptive terms that aren't actors/directors/titles (e.g., "scary", "romantic", "thrilling")

EXAMPLES:
- "Give me 10 movies starring Tom Cruise" → {"query": "Tom Cruise", "type": "movie", "count": 10}
- "Show me action movies from the 90s" → {"genres": [28], "year": 1990, "type": "movie"}
- "Horror TV shows" → {"genres": [27], "type": "tv"}
- "Movies directed by Christopher Nolan" → {"query": "Christopher Nolan", "type": "movie"}

CRITICAL: Be precise. If unsure about a genre ID, don't include it. Always prioritize accuracy over completeness.

Respond with valid JSON only, no other text.`;

const SYSTEM_PROMPT_INFORMATION = `You are a knowledgeable and accurate AI assistant specialized in movies and TV shows. Your goal is to provide precise, factual information about:

- Movie and TV show details (plots, cast, directors, release dates)
- Actor and director filmographies and careers
- Entertainment industry facts and history
- Awards, box office performance, and critical reception

ACCURACY GUIDELINES:
1. Only provide information you are confident about
2. If uncertain, clearly state "I'm not certain, but..." or "Based on my knowledge..."
3. For recent information (last 1-2 years), acknowledge potential limitations
4. Cite specific details when possible (e.g., "released in 1994", "directed by...")
5. If asked about specific numbers (e.g., "how many movies"), be precise or indicate if the number is approximate
6. Distinguish between facts and opinions

RESPONSE STYLE:
- Be concise but informative
- Use clear, structured answers
- If the question is ambiguous, ask for clarification or provide the most likely interpretation
- For filmography questions, list notable works but note if the list is not exhaustive

Remember: Accuracy is more important than completeness. It's better to say "I don't have that specific information" than to guess.`;

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
        temperature: 0.2, // Lower temperature for more consistent, accurate extraction
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      aiResponseText = completion.choices[0]?.message?.content || "";
      const parsed = JSON.parse(aiResponseText);
      
      // Validate and clean extracted parameters
      extractedParams = {
        intent: "RECOMMENDATION",
        query: parsed.query?.trim() || undefined,
        genres: Array.isArray(parsed.genres) ? parsed.genres.filter((g: unknown) => typeof g === "number" && g > 0) : [],
        year: typeof parsed.year === "number" && parsed.year > 1900 && parsed.year <= new Date().getFullYear() + 1 ? parsed.year : undefined,
        type: parsed.type === "movie" || parsed.type === "tv" ? parsed.type : "all",
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.filter((k: unknown) => typeof k === "string") : [],
        count: typeof parsed.count === "number" && parsed.count > 0 && parsed.count <= 50 ? parsed.count : undefined,
      };
      
      console.log("[AI Chat] Validated extracted params:", extractedParams);
    } catch (openaiError) {
      console.error("OpenAI error:", openaiError);
      // Fallback: try to extract basic info from message
      const lowerMessage = message.toLowerCase();
      let fallbackType: "movie" | "tv" | "all" = "all";
      if (lowerMessage.includes("movie") || lowerMessage.includes("film")) {
        fallbackType = "movie";
      } else if (lowerMessage.includes("tv") || lowerMessage.includes("show") || lowerMessage.includes("series")) {
        fallbackType = "tv";
      }
      
      extractedParams = {
        intent: "RECOMMENDATION",
        query: message, // Use full message as query for fallback
        type: fallbackType,
      };
      console.log("[AI Chat] Using fallback params:", extractedParams);
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
    const query = extractedParams.query?.trim();

    console.log("[AI Chat] Extracted params:", { query, genres, year, type, count: extractedParams.count });

    // Priority: If there's a query (actor, director, title), use search
    // Otherwise, if there are genres or year, use discover
    if (query) {
      // Use search API for actor/director/title queries
      console.log("[AI Chat] Using search API with query:", query);
      const searchType = type === "movie" ? "movie" : type === "tv" ? "tv" : "all";
      
      const searchPromises: Promise<{ results: (TMDBMovie | TMDBSeries)[] }>[] = [];
      
      // Search multiple pages if we need more results
      const pagesToSearch = extractedParams.count && extractedParams.count > 20 ? 2 : 1;
      
      if (searchType === "movie" || searchType === "all") {
        for (let page = 1; page <= pagesToSearch; page++) {
          searchPromises.push(
            searchMovies(query, page).then((r) => ({ results: r.results }))
          );
        }
      }
      
      if (searchType === "tv" || searchType === "all") {
        for (let page = 1; page <= pagesToSearch; page++) {
          searchPromises.push(
            searchTV(query, page).then((r) => ({ results: r.results }))
          );
        }
      }

      const searchResults = await Promise.all(searchPromises);
      const combined = searchResults.flatMap((r) => r.results);
      
      // Deduplicate by ID and limit to requested count
      const seen = new Set<number>();
      const maxResults = extractedParams.count || 20;
      results = combined.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      }).slice(0, maxResults);

      console.log("[AI Chat] Search results:", results.length, "from", pagesToSearch, "page(s)");
      resultIds = results.map((r) => r.id);
      resultTypes = results.map((r) => ("title" in r ? "movie" : "tv"));
    } else if (genres.length > 0 || year) {
      // Use discover with filters
      console.log("[AI Chat] Using discover API with filters:", { genres, year });
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

      console.log("[AI Chat] Discover results:", results.length);
      resultIds = results.map((r) => r.id);
      resultTypes = results.map((r) => ("title" in r ? "movie" : "tv"));
    } else {
      // Fallback: use the original message as query
      console.log("[AI Chat] No query or filters, using message as fallback query");
      const [movieResults, tvResults] = await Promise.all([
        searchMovies(message, 1),
        searchTV(message, 1),
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

      console.log("[AI Chat] Fallback search results:", results.length);
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

