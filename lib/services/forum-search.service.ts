/**
 * Service for forum search functionality
 * Handles full-text search, tag autocomplete, and suggestions
 */

import { db } from "@/lib/db";

export interface SearchSuggestion {
  type: "tag" | "category" | "post";
  value: string;
  label: string;
  count?: number;
}

/**
 * Get tag autocomplete suggestions
 */
export async function getTagSuggestions(query: string, limit: number = 10): Promise<string[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const posts = await db.forumPost.findMany({
      where: {
        isHidden: false,
        tags: {
          hasSome: [], // Will filter below
        },
      },
      select: {
        tags: true,
      },
      take: 1000, // Get a large sample to find popular tags
    });

    // Extract all tags and count occurrences
    const tagCounts = new Map<string, number>();
    const queryLower = query.toLowerCase();

    posts.forEach((post) => {
      post.tags.forEach((tag) => {
        if (tag.toLowerCase().includes(queryLower)) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      });
    });

    // Sort by count and return top results
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag);
  } catch (error) {
    console.error("Error fetching tag suggestions:", error);
    return [];
  }
}

/**
 * Get search suggestions based on query
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 5
): Promise<SearchSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const suggestions: SearchSuggestion[] = [];
  const queryLower = query.toLowerCase().trim();

  try {
    // Get matching tags
    const tagSuggestions = await getTagSuggestions(query, limit);
    tagSuggestions.forEach((tag) => {
      suggestions.push({
        type: "tag",
        value: tag,
        label: `#${tag}`,
      });
    });

    // Get matching categories
    const categories = await db.forumCategory.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      take: limit,
      select: {
        name: true,
        slug: true,
      },
    });

    categories.forEach((category) => {
      suggestions.push({
        type: "category",
        value: category.slug,
        label: category.name,
      });
    });

    // Get matching post titles
    const posts = await db.forumPost.findMany({
      where: {
        isHidden: false,
        title: {
          contains: query,
          mode: "insensitive",
        },
      },
      take: limit,
      select: {
        title: true,
        slug: true,
      },
    });

    posts.forEach((post) => {
      suggestions.push({
        type: "post",
        value: post.slug,
        label: post.title,
      });
    });

    return suggestions.slice(0, limit);
  } catch (error) {
    console.error("Error fetching search suggestions:", error);
    return [];
  }
}

/**
 * Perform full-text search on posts
 */
export async function searchPosts(
  query: string,
  options: {
    categoryId?: string;
    tag?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{
  posts: any[];
  total: number;
}> {
  if (!query || query.trim().length === 0) {
    return { posts: [], total: 0 };
  }

  const { categoryId, tag, limit = 20, offset = 0 } = options;

  try {
    const where: any = {
      isHidden: false,
      OR: [
        { title: { contains: query.trim(), mode: "insensitive" } },
        { content: { contains: query.trim(), mode: "insensitive" } },
      ],
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    const [posts, total] = await Promise.all([
      db.forumPost.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              color: true,
              icon: true,
            },
          },
          _count: {
            select: {
              replies: true,
              reactions: true,
            },
          },
        },
        orderBy: [
          { updatedAt: "desc" },
          { createdAt: "desc" },
        ],
        take: limit,
        skip: offset,
      }),
      db.forumPost.count({ where }),
    ]);

    return { posts, total };
  } catch (error) {
    console.error("Error searching posts:", error);
    return { posts: [], total: 0 };
  }
}

