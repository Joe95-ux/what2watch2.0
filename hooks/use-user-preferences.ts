import { useQuery } from "@tanstack/react-query";

interface UserPreferences {
  favoriteGenres: number[];
  preferredTypes: ("movie" | "tv")[];
  dislikedGenres?: number[];
  minRating?: number;
  preferredLanguages?: string[];
  minYear?: number;
  maxYear?: number;
  onboardingCompleted: boolean;
}

const fetchUserPreferences = async (): Promise<UserPreferences | null> => {
  const response = await fetch("/api/user/preferences");
  if (!response.ok) {
    if (response.status === 401 || response.status === 404) {
      return null; // Not authenticated or preferences not found
    }
    throw new Error("Failed to fetch user preferences");
  }
  const data = await response.json();
  return data.preferences as UserPreferences | null;
};

export function useUserPreferences() {
  return useQuery<UserPreferences | null>({
    queryKey: ["user-preferences"],
    queryFn: fetchUserPreferences,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: false, // Don't retry if unauthorized
  });
}

