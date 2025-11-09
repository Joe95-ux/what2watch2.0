import { useQuery } from "@tanstack/react-query";
import { TMDBGenre } from "@/lib/tmdb";

export const genreQueryKeys = {
  all: ["genres"] as const,
  allGenres: () => [...genreQueryKeys.all, "all"] as const,
};

const fetchAllGenres = async (): Promise<TMDBGenre[]> => {
  const res = await fetch("/api/genres");
  if (!res.ok) throw new Error("Failed to fetch genres");
  const data = await res.json();
  return data.all || [];
};

export function useAllGenres() {
  return useQuery({
    queryKey: genreQueryKeys.allGenres(),
    queryFn: fetchAllGenres,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours (genres don't change often)
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
}

