/**
 * Web Search Utilities
 * 
 * This module provides web search functionality for fetching current information.
 * Supports multiple providers: Tavily (recommended), SerpAPI, Google Custom Search
 */

interface WebSearchResult {
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
}

interface WebSearchResponse {
  results: WebSearchResult[];
  query: string;
  provider: string;
}

/**
 * Search the web using Tavily API (Recommended for AI applications)
 * Get API key from: https://tavily.com
 * Free tier: 1,000 searches/month
 */
export async function searchWebTavily(query: string): Promise<WebSearchResponse> {
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

  if (!TAVILY_API_KEY) {
    return { results: [], query, provider: "tavily" };
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: "basic", // "basic" or "advanced"
        include_answer: true,
        include_images: false,
        include_raw_content: false,
        max_results: 5, // Limit to 5 most relevant results
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Web Search] Tavily API error (${response.status}):`, errorText);
      throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Tavily returns both an 'answer' field (when include_answer: true) and 'results' array
    const results = (data.results || []).map((result: any) => ({
      title: result.title || "",
      url: result.url || "",
      content: result.content || "",
      publishedDate: result.published_date || undefined,
    }));

    // If there's an answer field, add it as the first result
    if (data.answer) {
      results.unshift({
        title: `Answer: ${query}`,
        url: "",
        content: data.answer,
      });
    }

    return {
      results,
      query,
      provider: "tavily",
    };
  } catch (error) {
    console.error("Tavily search error:", error);
    return { results: [], query, provider: "tavily" };
  }
}

/**
 * Search the web using SerpAPI (Google Search Results)
 * Get API key from: https://serpapi.com
 * Free tier: 100 searches/month
 */
export async function searchWebSerpAPI(query: string): Promise<WebSearchResponse> {
  const SERP_API_KEY = process.env.SERP_API_KEY;

  if (!SERP_API_KEY) {
    console.warn("SERP_API_KEY not configured. Web search disabled.");
    return { results: [], query, provider: "serpapi" };
  }

  try {
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${SERP_API_KEY}&num=5`
    );

    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      results: (data.organic_results || []).map((result: any) => ({
        title: result.title || "",
        url: result.link || "",
        content: result.snippet || "",
      })),
      query,
      provider: "serpapi",
    };
  } catch (error) {
    console.error("SerpAPI search error:", error);
    return { results: [], query, provider: "serpapi" };
  }
}

/**
 * Search the web using Google Custom Search API
 * Get API key from: https://console.cloud.google.com
 * Free tier: 100 searches/day
 */
export async function searchWebGoogle(query: string): Promise<WebSearchResponse> {
  const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
  const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    console.warn("Google Search API keys not configured. Web search disabled.");
    return { results: [], query, provider: "google" };
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&num=5`
    );

    if (!response.ok) {
      throw new Error(`Google Search API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      results: (data.items || []).map((item: any) => ({
        title: item.title || "",
        url: item.link || "",
        content: item.snippet || "",
      })),
      query,
      provider: "google",
    };
  } catch (error) {
    console.error("Google Search API error:", error);
    return { results: [], query, provider: "google" };
  }
}

/**
 * Main web search function - tries providers in order of preference
 * Falls back gracefully if no provider is configured
 */
export async function searchWeb(query: string): Promise<WebSearchResponse> {
  // Priority order: Tavily > SerpAPI > Google Custom Search
  if (process.env.TAVILY_API_KEY) {
    return searchWebTavily(query);
  } else if (process.env.SERP_API_KEY) {
    return searchWebSerpAPI(query);
  } else if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_CSE_ID) {
    return searchWebGoogle(query);
  } else {
    console.warn("No web search API configured. Add TAVILY_API_KEY, SERP_API_KEY, or GOOGLE_SEARCH_API_KEY to enable web search.");
    return { results: [], query, provider: "none" };
  }
}

/**
 * Format web search results for inclusion in AI prompt
 */
export function formatWebSearchResults(searchResponse: WebSearchResponse): string {
  if (searchResponse.results.length === 0) {
    return "";
  }

  let formatted = "\n\nCURRENT WEB INFORMATION:\n";
  formatted += `(Source: ${searchResponse.provider}, Query: "${searchResponse.query}")\n\n`;

  searchResponse.results.forEach((result, index) => {
    formatted += `${index + 1}. ${result.title}\n`;
    formatted += `   URL: ${result.url}\n`;
    formatted += `   ${result.content}\n`;
    if (result.publishedDate) {
      formatted += `   Published: ${result.publishedDate}\n`;
    }
    formatted += "\n";
  });

  return formatted;
}
