import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { AiChatIntent } from "@prisma/client";
import OpenAI from "openai";
import { searchMovies, searchTV, searchPerson, getPersonMovieCredits, getPersonTVCredits, discoverMovies, discoverTV, TMDBMovie, TMDBSeries } from "@/lib/tmdb";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STOP_WORDS = new Set<string>([
  "a",
  "about",
  "all",
  "am",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "best",
  "can",
  "could",
  "for",
  "from",
  "good",
  "great",
  "have",
  "highest",
  "i",
  "in",
  "is",
  "it",
  "its",
  "let",
  "like",
  "me",
  "movie",
  "movies",
  "of",
  "on",
  "please",
  "recommend",
  "show",
  "shows",
  "series",
  "some",
  "suggest",
  "that",
  "the",
  "this",
  "time",
  "to",
  "top",
  "tv",
  "want",
  "which",
  "with",
]);

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
   - Movie/TV show titles (e.g., "The Matrix", "Breaking Bad", "Lord of the Rings")
   - Character names if searching for specific roles
   - Extract ONLY the name/title, not descriptive words like "movies", "films", "starring", "all", etc.
   - For actor queries like "Tom Cruise movies" or "40 Arnold Schwarzenegger movies", extract just the name: "Tom Cruise" or "Arnold Schwarzenegger"
   - For title queries like "All Lord of the Rings movies", extract just the title: "Lord of the Rings" (ignore "All" and "movies")

2. GENRES field: Use ONLY when user explicitly mentions a genre:
   - Action=28, Adventure=12, Animation=16, Comedy=35, Crime=80, Documentary=99, Drama=18, Family=10751, Fantasy=14, History=36, Horror=27, Music=10402, Mystery=9648, Romance=10749, Sci-Fi=878, Thriller=53, War=10752, Western=37
   - TV genres: Action & Adventure=10759, Animation=16, Comedy=35, Crime=80, Documentary=99, Drama=18, Family=10751, Kids=10762, Mystery=9648, News=10763, Reality=10764, Sci-Fi & Fantasy=10765, Soap=10766, Talk=10767, War & Politics=10768, Western=37

3. YEAR field: Extract if user mentions a specific year or decade (e.g., "90s" = 1990, "2020s" = 2020)

4. TYPE field: 
   - "movie" if user says "movies", "film", "cinema"
   - "tv" if user says "TV shows", "series", "television"
   - "all" if not specified or user says "movies and TV shows"

5. COUNT field: Extract exact number if specified (e.g., "10 movies" = 10, "show me 5" = 5, "a few" = 5, "several" = 8)

6. KEYWORDS field: Use for descriptive terms that aren't actors/directors/titles:
   - Themes: "tech", "technology", "christmas", "holiday", "romance", "thriller", "inspiring", "feel-good"
   - Moods: "scary", "romantic", "thrilling", "uplifting", "dark", "cozy"
   - Topics: "startup", "hacker", "AI", "space", "war", "crime"
   - Extract ALL relevant keywords from the query

EXAMPLES:
- "Give me 10 movies starring Tom Cruise" → {"query": "Tom Cruise", "type": "movie", "count": 10}
- "Tom Cruise movies" → {"query": "Tom Cruise", "type": "movie"}
- "40 Arnold Schwarzenegger movies" → {"query": "Arnold Schwarzenegger", "type": "movie", "count": 40}
- "Show me action movies from the 90s" → {"genres": [28], "year": 1990, "type": "movie"}
- "Horror TV shows" → {"genres": [27], "type": "tv"}
- "Movies directed by Christopher Nolan" → {"query": "Christopher Nolan", "type": "movie"}
- "Best tech movies of all time" → {"keywords": ["tech", "technology"], "type": "movie"}
- "Christmas movies" → {"keywords": ["christmas", "holiday"], "type": "movie"}
- "I want inspiring movies" → {"keywords": ["inspiring", "uplifting"], "type": "movie"}

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

    const lowerMessage = message.toLowerCase();

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
          model: "gpt-4o", // Use GPT-4o for information queries (has better knowledge and reasoning)
          messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          temperature: 0.7,
          max_tokens: 1500, // Increased for more detailed responses
          // Note: GPT-4o API doesn't have built-in web browsing, but has knowledge up to Oct 2023
          // For real-time info, we'd need to add a web search function/tool (adds cost)
        });

        const aiResponseText = completion.choices[0]?.message?.content || "";
        const responseTime = Date.now() - startTime;
        
        // Extract token usage from OpenAI response
        const usage = completion.usage;
        const promptTokens = usage?.prompt_tokens ?? null;
        const completionTokens = usage?.completion_tokens ?? null;
        const totalTokens = usage?.total_tokens ?? null;

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
              model: "gpt-4o",
              promptTokens,
              completionTokens,
              totalTokens,
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
    let recommendationPromptTokens: number | null = null;
    let recommendationCompletionTokens: number | null = null;
    let recommendationTotalTokens: number | null = null;

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
      
      // Extract token usage for recommendation mode
      const recommendationUsage = completion.usage;
      recommendationPromptTokens = recommendationUsage?.prompt_tokens ?? null;
      recommendationCompletionTokens = recommendationUsage?.completion_tokens ?? null;
      recommendationTotalTokens = recommendationUsage?.total_tokens ?? null;
      
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
    let query = extractedParams.query?.trim();
    let keywords = Array.isArray(extractedParams.keywords)
      ? [...extractedParams.keywords]
      : [];
    const wantsHighQuality = /\b(best|top|highest rated|greatest|must[-\s]?watch|critically acclaimed|award[-\s]?winning)\b/i.test(
      lowerMessage,
    );

    if (query) {
      // Remove "All" from the beginning of the query if present (e.g., "All Lord of the rings" -> "Lord of the rings")
      query = query.replace(/^all\s+/i, "").trim();
      
      // Check if query looks like a specific title (has proper capitalization, multiple words, or known patterns)
      // Don't convert known titles to keywords
      const looksLikeTitle = 
        query.split(/\s+/).length >= 2 && // Multiple words
        (query.split(/\s+/).some(word => /^[A-Z]/.test(word)) || // Has capitalized words
         /^(the|a|an)\s+/i.test(query)); // Starts with article
      
      // Only convert to keywords if it doesn't look like a specific title
      if (!looksLikeTitle) {
        const genericQueryPattern =
          /(best|top|movie|movies|film|films|tv|show|shows|series|of all time|holiday|christmas|tech|technology|romance|thriller|inspiring|feel|mood|recommend)/i;
        if (genericQueryPattern.test(query.toLowerCase())) {
          const derivedKeywords = query
            .toLowerCase()
            .split(/\s+/)
            .map((word) => word.replace(/[^a-z0-9]/g, ""))
            .filter((word) => word && !STOP_WORDS.has(word));
          if (derivedKeywords.length > 0) {
            keywords = Array.from(new Set([...(keywords || []), ...derivedKeywords])).slice(0, 6);
            query = undefined;
          }
        }
      } else {
        // For title queries, remove common words like "movies", "films" from the end
        query = query.replace(/\s+(movies|films|movie|film|shows|show|series)$/i, "").trim();
      }
    }

    extractedParams = {
      ...extractedParams,
      query,
      keywords,
    };

    console.log("[AI Chat] Extracted params:", { query, keywords, genres, year, type, count: extractedParams.count });

    const searchKeywords = keywords || [];

    // Priority: If there's a query (actor, director, title), use search
    // Otherwise, if there are genres or year, use discover
    if (query) {
      // First, try to find if this is a person (actor/director) query
      // Check if query looks like a person name (contains common name patterns)
      const trimmedQuery = query.trim();
      const words = trimmedQuery.split(/\s+/);
      const looksLikePersonName = 
        words.length >= 2 && 
        words.every(word => /^[A-Z][a-z]+/.test(word)) && 
        !trimmedQuery.toLowerCase().includes('movie') &&
        !trimmedQuery.toLowerCase().includes('film') &&
        !trimmedQuery.toLowerCase().includes('show') &&
        !trimmedQuery.toLowerCase().includes('series');
      
      if (looksLikePersonName) {
        console.log("[AI Chat] Query looks like a person name, searching for person first:", query);
        try {
          // Search for the person
          const personSearchResults = await searchPerson(query, 1);
          
          if (personSearchResults.results.length > 0) {
            // Use the first (most popular) matching person
            const person = personSearchResults.results[0];
            console.log("[AI Chat] Found person:", person.name, "ID:", person.id);
            
            // Get their filmography
            const filmographyPromises: Promise<{ results: (TMDBMovie | TMDBSeries)[] }>[] = [];
            
            if (type === "movie" || type === "all") {
              filmographyPromises.push(
                getPersonMovieCredits(person.id).then((credits) => ({
                  results: credits.cast.map((credit) => ({
                    id: credit.id,
                    title: credit.title,
                    overview: "",
                    poster_path: credit.poster_path,
                    backdrop_path: credit.backdrop_path,
                    release_date: credit.release_date,
                    vote_average: credit.vote_average,
                    vote_count: 0,
                    genre_ids: [],
                    popularity: 0,
                    adult: false,
                    original_language: "en",
                    original_title: credit.title,
                  } as TMDBMovie)),
                }))
              );
            }
            
            if (type === "tv" || type === "all") {
              filmographyPromises.push(
                getPersonTVCredits(person.id).then((credits) => ({
                  results: credits.cast.map((credit) => ({
                    id: credit.id,
                    name: credit.name,
                    overview: "",
                    poster_path: credit.poster_path,
                    backdrop_path: credit.backdrop_path,
                    first_air_date: credit.first_air_date,
                    vote_average: credit.vote_average,
                    vote_count: 0,
                    genre_ids: [],
                    popularity: 0,
                    original_language: "en",
                    original_name: credit.name,
                  } as TMDBSeries)),
                }))
              );
            }
            
            const filmographyResults = await Promise.all(filmographyPromises);
            const combined = filmographyResults.flatMap((r) => r.results);
            
            // Sort by release date (newest first) and deduplicate
            const seen = new Set<number>();
            const maxResults = extractedParams.count || 20;
            results = combined
              .filter((item) => {
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
              })
              .sort((a, b) => {
                // Sort by release date (newest first)
                const dateA = "title" in a ? a.release_date : a.first_air_date;
                const dateB = "title" in b ? b.release_date : b.first_air_date;
                if (dateA && dateB) {
                  return new Date(dateB).getTime() - new Date(dateA).getTime();
                }
                return 0;
              })
              .slice(0, maxResults);
            
            console.log("[AI Chat] Person filmography results:", results.length);
            resultIds = results.map((r) => r.id);
            resultTypes = results.map((r) => ("title" in r ? "movie" : "tv"));
          } else {
            // Person not found, fall through to regular search
            console.log("[AI Chat] Person not found, falling back to regular search");
            throw new Error("Person not found");
          }
        } catch (personError) {
          // If person search fails, fall back to regular movie/TV search
          console.log("[AI Chat] Person search failed, using regular search:", personError);
          // Fall through to regular search below
        }
      }
      
      // If person search didn't work or query doesn't look like a person name, use regular search
      if (results.length === 0) {
        console.log("[AI Chat] Using regular search API with query:", query);
        const searchType = type === "movie" ? "movie" : type === "tv" ? "tv" : "all";
        
        const searchPromises: Promise<{ results: (TMDBMovie | TMDBSeries)[] }>[] = [];
        
        // Calculate how many pages we need based on requested count
        // Each page typically has 20 results, so for 40 results we need at least 2 pages
        const maxResults = extractedParams.count || 20;
        const pagesToSearch = Math.min(Math.ceil(maxResults / 20) + 1, 5); // Search up to 5 pages max
        
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
        results = combined
          .filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          })
          .filter((item) => {
            if (!wantsHighQuality) return true;
            const votes = item.vote_count || 0;
            return (item.vote_average || 0) >= 6.5 && votes >= 200;
          })
          .sort((a, b) => {
            if (wantsHighQuality) {
              const ratingDiff = (b.vote_average || 0) - (a.vote_average || 0);
              if (ratingDiff !== 0) return ratingDiff;
              return (b.vote_count || 0) - (a.vote_count || 0);
            }
            return 0;
          })
          .slice(0, maxResults);

        console.log("[AI Chat] Regular search results:", results.length, "from", pagesToSearch, "page(s)");
        resultIds = results.map((r) => r.id);
        resultTypes = results.map((r) => ("title" in r ? "movie" : "tv"));
      }
    } else if (searchKeywords.length > 0) {
      console.log("[AI Chat] Using keyword-based search with discover API:", searchKeywords);
      const searchType = type === "movie" ? "movie" : type === "tv" ? "tv" : "all";
      const maxResults = extractedParams.count || 20;
      
      // For keyword searches, use discover API to get a large pool of results
      // Then filter by checking if keywords appear in title/overview
      const discoverPromises: Promise<{ results: (TMDBMovie | TMDBSeries)[] }>[] = [];
      const searchPromises: Promise<{ results: (TMDBMovie | TMDBSeries)[] }>[] = [];

      // Get multiple pages from discover API for better coverage
      const pagesToSearch = wantsHighQuality ? 5 : 3;

      // Use discover API for better keyword-based discovery
      if (searchType === "movie" || searchType === "all") {
        for (let page = 1; page <= pagesToSearch; page++) {
          discoverPromises.push(
            discoverMovies({
              page,
              sortBy: wantsHighQuality ? "vote_average.desc" : "popularity.desc",
              minRating: wantsHighQuality ? 6.5 : undefined,
            }).then((r) => ({ results: r.results }))
          );
        }
      }

      if (searchType === "tv" || searchType === "all") {
        for (let page = 1; page <= pagesToSearch; page++) {
          discoverPromises.push(
            discoverTV({
              page,
              sortBy: wantsHighQuality ? "vote_average.desc" : "popularity.desc",
              minRating: wantsHighQuality ? 6.5 : undefined,
            }).then((r) => ({ results: r.results }))
          );
        }
      }

      // Also search by keyword terms (in case they match titles directly)
      const keywordTerms = searchKeywords.slice(0, 3);
      keywordTerms.forEach((keyword) => {
        const sanitized = keyword.trim();
        if (!sanitized) return;

        if (searchType === "movie" || searchType === "all") {
          searchPromises.push(
            searchMovies(sanitized, 1).then((r) => ({ results: r.results }))
          );
        }

        if (searchType === "tv" || searchType === "all") {
          searchPromises.push(
            searchTV(sanitized, 1).then((r) => ({ results: r.results }))
          );
        }
      });

      const [discoverResults, searchResults] = await Promise.all([
        Promise.all(discoverPromises),
        Promise.all(searchPromises),
      ]);

      const combined = [
        ...discoverResults.flatMap((r) => r.results),
        ...searchResults.flatMap((r) => r.results),
      ];

      // Filter results that match keywords in title or overview
      const keywordLower = searchKeywords.map((k) => k.toLowerCase());
      const seen = new Set<number>();

      results = combined
        .filter((item) => {
          if (!item || !item.id) return false;
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          
          // Check if item matches keywords
          const title = ("title" in item ? item.title : item.name || "").toLowerCase();
          const overview = (item.overview || "").toLowerCase();
          const text = `${title} ${overview}`;
          
          // At least one keyword should match
          return keywordLower.some((keyword) => text.includes(keyword));
        })
        .filter((item) => {
          if (!wantsHighQuality) return true;
          const votes = item.vote_count || 0;
          return (item.vote_average || 0) >= 6.5 && votes >= 200;
        })
        .sort((a, b) => {
          if (wantsHighQuality) {
            const ratingDiff = (b.vote_average || 0) - (a.vote_average || 0);
            if (ratingDiff !== 0) return ratingDiff;
            return (b.vote_count || 0) - (a.vote_count || 0);
          }
          return (b.popularity || 0) - (a.popularity || 0);
        })
        .slice(0, maxResults);

      console.log("[AI Chat] Keyword search results:", results.length, "from", combined.length, "total candidates");
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
            sortBy: wantsHighQuality ? "vote_average.desc" : "popularity.desc",
            minRating: wantsHighQuality ? 6.5 : undefined,
          }).then((r) => ({ results: r.results }))
        );
      }

      if (type === "tv" || type === "all") {
        discoverPromises.push(
          discoverTV({
            page: 1,
            genre: genres.length > 0 ? genres : undefined,
            year,
            sortBy: wantsHighQuality ? "vote_average.desc" : "popularity.desc",
            minRating: wantsHighQuality ? 6.5 : undefined,
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
          model: "gpt-4o-mini", // Recommendation mode uses gpt-4o-mini
          promptTokens: recommendationPromptTokens,
          completionTokens: recommendationCompletionTokens,
          totalTokens: recommendationTotalTokens,
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

