import { useQuery } from "@tanstack/react-query";
import { TMDBPerson, TMDBPersonImages, TMDBPersonMovieCredits, TMDBPersonTVCredits } from "@/lib/tmdb";

/**
 * Hook to fetch person details
 */
export function usePersonDetails(personId: number | null) {
  return useQuery({
    queryKey: ["person", personId, "details"],
    queryFn: async () => {
      if (!personId) return null;
      const response = await fetch(`/api/person/${personId}`);
      if (!response.ok) throw new Error("Failed to fetch person details");
      return response.json() as Promise<TMDBPerson>;
    },
    enabled: !!personId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to fetch person images
 */
export function usePersonImages(personId: number | null) {
  return useQuery({
    queryKey: ["person", personId, "images"],
    queryFn: async () => {
      if (!personId) return null;
      const response = await fetch(`/api/person/${personId}/images`);
      if (!response.ok) throw new Error("Failed to fetch person images");
      return response.json() as Promise<TMDBPersonImages>;
    },
    enabled: !!personId,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Hook to fetch person movie credits
 */
export function usePersonMovieCredits(personId: number | null) {
  return useQuery({
    queryKey: ["person", personId, "movie-credits"],
    queryFn: async () => {
      if (!personId) return null;
      const response = await fetch(`/api/person/${personId}/movie-credits`);
      if (!response.ok) throw new Error("Failed to fetch person movie credits");
      return response.json() as Promise<TMDBPersonMovieCredits>;
    },
    enabled: !!personId,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Hook to fetch person TV credits
 */
export function usePersonTVCredits(personId: number | null) {
  return useQuery({
    queryKey: ["person", personId, "tv-credits"],
    queryFn: async () => {
      if (!personId) return null;
      const response = await fetch(`/api/person/${personId}/tv-credits`);
      if (!response.ok) throw new Error("Failed to fetch person TV credits");
      return response.json() as Promise<TMDBPersonTVCredits>;
    },
    enabled: !!personId,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

