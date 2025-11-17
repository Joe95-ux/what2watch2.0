"use client";

import { useQuery } from "@tanstack/react-query";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

export type IntentType = "tonight" | "date-night" | "family" | "quick" | "weekend" | "classic";

interface IntentRecommendation {
  item: TMDBMovie | TMDBSeries;
  reason: string;
  matchScore?: number;
}

// Fetch recommendations based on intent
const fetchIntentRecommendations = async (
  intent: IntentType,
  favoriteGenres: number[],
  preferredTypes: ("movie" | "tv")[]
): Promise<IntentRecommendation[]> => {
  const params = new URLSearchParams();
  
  // Map intent to search parameters
  switch (intent) {
    case "tonight":
      // Popular, recent releases, good ratings
      params.set("sortBy", "popularity.desc");
      params.set("minRating", "7");
      break;
    case "date-night":
      // Romance, comedy, drama genres
      params.set("sortBy", "popularity.desc");
      params.set("minRating", "7");
      if (favoriteGenres.length > 0) {
        params.set("genre", favoriteGenres.slice(0, 3).join(","));
      }
      break;
    case "family":
      // Family-friendly, animation, comedy
      params.set("sortBy", "popularity.desc");
      params.set("minRating", "6.5");
      break;
    case "quick":
      // Movies under 100 minutes, TV episodes
      params.set("sortBy", "popularity.desc");
      break;
    case "weekend":
      // Longer content, series, binge-worthy
      params.set("sortBy", "popularity.desc");
      params.set("minRating", "7");
      break;
    case "classic":
      // Older content, high ratings
      params.set("sortBy", "vote_average.desc");
      params.set("minRating", "8");
      params.set("maxYear", String(new Date().getFullYear() - 10));
      break;
  }

  // Fetch for each preferred type
  const fetchPromises: Promise<IntentRecommendation[]>[] = [];
  
  for (const type of preferredTypes.length > 0 ? preferredTypes : ["movie", "tv"]) {
    params.set("type", type);
    params.set("page", "1");
    
    fetchPromises.push(
      fetch(`/api/search?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          const results = (data.results || []).slice(0, 10);
          return results.map((item: TMDBMovie | TMDBSeries) => ({
            item,
            reason: getReasonForIntent(intent, item),
            matchScore: calculateMatchScore(item, favoriteGenres),
          }));
        })
        .catch(() => [])
    );
  }

  const results = await Promise.all(fetchPromises);
  const combined = results.flat();
  
  // Remove duplicates and sort by match score
  const seen = new Set<string>();
  const unique = combined.filter((rec) => {
    const type = "title" in rec.item ? "movie" : "tv";
    const key = `${type}-${rec.item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
    .slice(0, 20);
};

function getReasonForIntent(intent: IntentType, item: TMDBMovie | TMDBSeries): string {
  const rating = item.vote_average || 0;
  const year = "release_date" in item 
    ? new Date(item.release_date || "").getFullYear()
    : new Date(item.first_air_date || "").getFullYear();

  switch (intent) {
    case "tonight":
      if (rating >= 8) return "Highly rated";
      if (rating >= 7) return "Popular choice";
      return "Trending now";
    case "date-night":
      return "Perfect for couples";
    case "family":
      return "Family-friendly";
    case "quick":
      return "Quick watch";
    case "weekend":
      return "Binge-worthy";
    case "classic":
      return `Classic from ${year}`;
    default:
      return "Recommended for you";
  }
}

function calculateMatchScore(
  item: TMDBMovie | TMDBSeries,
  favoriteGenres: number[]
): number {
  let score = item.vote_average || 0;
  
  // Boost score if it matches favorite genres
  if (item.genre_ids && favoriteGenres.length > 0) {
    const matchingGenres = item.genre_ids.filter((id) => favoriteGenres.includes(id));
    score += matchingGenres.length * 0.5;
  }
  
  // Boost for popularity
  score += (item.popularity || 0) / 100;
  
  return score;
}

export function useIntentRecommendations(
  intent: IntentType,
  favoriteGenres: number[],
  preferredTypes: ("movie" | "tv")[],
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["intent-recommendations", intent, favoriteGenres.join(","), preferredTypes.join(",")],
    queryFn: () => fetchIntentRecommendations(intent, favoriteGenres, preferredTypes),
    enabled: enabled && favoriteGenres.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

