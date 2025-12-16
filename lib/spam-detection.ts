/**
 * Spam detection utilities for forum content
 */

import { db } from "./db";

/**
 * Check for duplicate content (similar title or content)
 */
export async function checkDuplicateContent(
  title: string,
  content: string,
  userId: string,
  excludePostId?: string
): Promise<{ isDuplicate: boolean; similarity?: number; reason?: string }> {
  const titleLower = title.toLowerCase().trim();
  const contentLower = content.toLowerCase().trim();

  // Check for exact duplicate title
  const exactTitleMatch = await db.forumPost.findFirst({
    where: {
      title: {
        equals: title,
        mode: "insensitive",
      },
      userId,
      ...(excludePostId ? { id: { not: excludePostId } } : {}),
    },
    select: { id: true, createdAt: true },
  });

  if (exactTitleMatch) {
    // Check if it's recent (within last 24 hours)
    const hoursSinceCreation = (Date.now() - exactTitleMatch.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation < 24) {
      return {
        isDuplicate: true,
        similarity: 100,
        reason: "You have already created a post with this exact title recently.",
      };
    }
  }

  // Check for very similar titles (simple similarity check)
  const recentPosts = await db.forumPost.findMany({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
      ...(excludePostId ? { id: { not: excludePostId } } : {}),
    },
    select: { id: true, title: true, content: true },
    take: 10,
  });

  for (const post of recentPosts) {
    const postTitleLower = post.title.toLowerCase().trim();
    const postContentLower = post.content.toLowerCase().trim();

    // Calculate simple similarity (word overlap)
    const titleSimilarity = calculateSimilarity(titleLower, postTitleLower);
    const contentSimilarity = calculateSimilarity(contentLower, postContentLower);

    // If title is >80% similar or content is >90% similar, flag as duplicate
    if (titleSimilarity > 80 || contentSimilarity > 90) {
      return {
        isDuplicate: true,
        similarity: Math.max(titleSimilarity, contentSimilarity),
        reason: "This content is very similar to a post you created recently.",
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Calculate simple similarity between two strings (0-100)
 * Based on word overlap
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/).filter((w) => w.length > 2));
  const words2 = new Set(str2.split(/\s+/).filter((w) => w.length > 2));

  if (words1.size === 0 && words2.size === 0) return 100;
  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return (intersection.size / union.size) * 100;
}

/**
 * Check for rapid posting pattern (too many posts in short time)
 */
export async function checkRapidPosting(
  userId: string,
  maxPosts: number = 5,
  timeWindowMs: number = 60 * 60 * 1000 // 1 hour
): Promise<{ isRapid: boolean; count?: number; reason?: string }> {
  const recentPosts = await db.forumPost.count({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - timeWindowMs),
      },
    },
  });

  if (recentPosts >= maxPosts) {
    return {
      isRapid: true,
      count: recentPosts,
      reason: `You have created ${recentPosts} posts in the last hour. Please slow down.`,
    };
  }

  return { isRapid: false, count: recentPosts };
}

/**
 * Extract URLs from text content
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex);
  return matches || [];
}

