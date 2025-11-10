/**
 * Utility functions to calculate user preferences based on behavior
 */

interface ContentItem {
  tmdbId: number;
  mediaType: "movie" | "tv";
  genreIds?: number[];
  rating?: number; // User's rating (1-10)
  createdAt: Date;
}

interface BehaviorData {
  favorites: ContentItem[];
  recentlyViewed: ContentItem[];
  reviews: ContentItem[];
  playlistItems: ContentItem[];
}

/**
 * Calculate genre preferences from user behavior
 * Weights:
 * - Favorites: 3x weight
 * - Reviews with rating >= 7: 2x weight
 * - Recently viewed: 1x weight
 * - Playlist items: 1.5x weight
 */
export function calculateGenrePreferences(data: BehaviorData): number[] {
  const genreWeights = new Map<number, number>();
  const typeCounts = { movie: 0, tv: 0 };

  // Process favorites (highest weight)
  data.favorites.forEach((item) => {
    typeCounts[item.mediaType]++;
    if (item.genreIds && item.genreIds.length > 0) {
      item.genreIds.forEach((genreId) => {
        genreWeights.set(genreId, (genreWeights.get(genreId) || 0) + 3);
      });
    }
  });

  // Process reviews with high ratings (2x weight)
  data.reviews.forEach((item) => {
    if (item.rating && item.rating >= 7 && item.genreIds && item.genreIds.length > 0) {
      item.genreIds.forEach((genreId) => {
        genreWeights.set(genreId, (genreWeights.get(genreId) || 0) + 2);
      });
    }
  });

  // Process playlist items (1.5x weight)
  data.playlistItems.forEach((item) => {
    if (item.genreIds && item.genreIds.length > 0) {
      item.genreIds.forEach((genreId) => {
        genreWeights.set(genreId, (genreWeights.get(genreId) || 0) + 1.5);
      });
    }
  });

  // Process recently viewed (1x weight, but only recent items)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  data.recentlyViewed
    .filter((item) => item.createdAt >= thirtyDaysAgo)
    .forEach((item) => {
      if (item.genreIds && item.genreIds.length > 0) {
        item.genreIds.forEach((genreId) => {
          genreWeights.set(genreId, (genreWeights.get(genreId) || 0) + 1);
        });
      }
    });

  // Sort genres by weight and return top 10
  const sortedGenres = Array.from(genreWeights.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([genreId]) => genreId);

  return sortedGenres;
}

/**
 * Calculate preferred types (movie vs tv) from user behavior
 */
export function calculatePreferredTypes(data: BehaviorData): ("movie" | "tv")[] {
  const typeCounts = { movie: 0, tv: 0 };

  // Count all interactions
  data.favorites.forEach((item) => typeCounts[item.mediaType]++);
  data.reviews.forEach((item) => typeCounts[item.mediaType]++);
  data.playlistItems.forEach((item) => typeCounts[item.mediaType]++);
  
  // Only count recent views (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  data.recentlyViewed
    .filter((item) => item.createdAt >= thirtyDaysAgo)
    .forEach((item) => typeCounts[item.mediaType]++);

  // Determine preferred types
  if (typeCounts.movie > typeCounts.tv * 1.5) {
    return ["movie"];
  } else if (typeCounts.tv > typeCounts.movie * 1.5) {
    return ["tv"];
  } else {
    return ["movie", "tv"];
  }
}

/**
 * Get genre IDs for a movie or TV show from TMDB
 * Fetches from our internal API which proxies to TMDB
 */
export async function getContentGenres(
  tmdbId: number,
  mediaType: "movie" | "tv"
): Promise<number[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(
      `${baseUrl}/api/${mediaType === "movie" ? "movies" : "tv"}/${tmdbId}`
    );
    if (response.ok) {
      const data = await response.json();
      // Handle both genre_ids array and genres object array
      if (data.genre_ids && Array.isArray(data.genre_ids)) {
        return data.genre_ids;
      }
      if (data.genres && Array.isArray(data.genres)) {
        return data.genres.map((g: { id: number }) => g.id);
      }
    }
  } catch (error) {
    console.error("Error fetching content genres:", error);
  }
  return [];
}

