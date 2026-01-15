import { NextRequest, NextResponse } from "next/server";
import { getSearchSuggestions, getTagSuggestions } from "@/lib/services/forum-search.service";

/**
 * GET - Get search suggestions (tags, categories, posts)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const type = searchParams.get("type"); // "all" | "tags" | "categories" | "posts"
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    if (type === "tags") {
      const tags = await getTagSuggestions(query, limit);
      return NextResponse.json({ suggestions: tags.map(tag => ({
        type: "tag" as const,
        value: tag,
        label: `#${tag}`,
      })) });
    }

    const suggestions = await getSearchSuggestions(query, limit);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error fetching search suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}

