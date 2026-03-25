import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface FavoritePersonality {
  id: string;
  tmdbPersonId: number;
  name: string;
  profilePath: string | null;
  knownForDepartment: string | null;
  movieCount: number;
  tvCount: number;
  createdAt: string;
}

async function fetchFavoritePersonalities(): Promise<FavoritePersonality[]> {
  const res = await fetch("/api/favorite-personalities");
  if (!res.ok) throw new Error("Failed to fetch favorite personalities");
  const data = await res.json();
  return data.favorites ?? [];
}

async function addFavoritePersonality(input: {
  tmdbPersonId: number;
  name: string;
  profilePath?: string | null;
  knownForDepartment?: string | null;
  movieCount?: number;
  tvCount?: number;
}) {
  const res = await fetch("/api/favorite-personalities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to add favorite personality");
  return res.json();
}

async function removeFavoritePersonality(tmdbPersonId: number) {
  const res = await fetch(`/api/favorite-personalities?tmdbPersonId=${tmdbPersonId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to remove favorite personality");
  return res.json();
}

export function useFavoritePersonalities() {
  return useQuery({
    queryKey: ["favorite-personalities"],
    queryFn: fetchFavoritePersonalities,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
  });
}

export function useToggleFavoritePersonality() {
  const queryClient = useQueryClient();
  const { data: favorites = [] } = useFavoritePersonalities();

  const addMutation = useMutation({
    mutationFn: addFavoritePersonality,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["favorite-personalities"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeFavoritePersonality,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["favorite-personalities"] });
    },
  });

  return {
    isFavorite: (tmdbPersonId: number) =>
      favorites.some((p) => p.tmdbPersonId === tmdbPersonId),
    toggle: async (person: {
      id: number;
      name: string;
      profile_path?: string | null;
      known_for_department?: string | null;
      movieCount?: number;
      tvCount?: number;
    }) => {
      const exists = favorites.some((p) => p.tmdbPersonId === person.id);
      if (exists) {
        await removeMutation.mutateAsync(person.id);
      } else {
        await addMutation.mutateAsync({
          tmdbPersonId: person.id,
          name: person.name,
          profilePath: person.profile_path ?? null,
          knownForDepartment: person.known_for_department ?? null,
          movieCount: person.movieCount ?? 0,
          tvCount: person.tvCount ?? 0,
        });
      }
    },
    isLoading: addMutation.isPending || removeMutation.isPending,
  };
}

