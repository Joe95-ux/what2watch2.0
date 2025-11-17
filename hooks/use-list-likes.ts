import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Like a list
export function useLikeList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (listId: string) => {
      const response = await fetch(`/api/lists/${listId}/like`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to like list");
      }
      return response.json();
    },
    onMutate: async (listId) => {
      await queryClient.cancelQueries({ queryKey: ["list", listId, "like"] });

      const previousStatus = queryClient.getQueryData<{ isLiked: boolean }>([
        "list",
        listId,
        "like",
      ]);

      queryClient.setQueryData<{ isLiked: boolean }>(
        ["list", listId, "like"],
        { isLiked: true }
      );

      return { previousStatus };
    },
    onError: (err, listId, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(
          ["list", listId, "like"],
          context.previousStatus
        );
      }
    },
    onSuccess: (_, listId) => {
      queryClient.invalidateQueries({ queryKey: ["list", listId, "like"] });
      queryClient.invalidateQueries({ queryKey: ["lists", "liked"] });
      queryClient.invalidateQueries({ queryKey: ["public-lists"] });
      queryClient.invalidateQueries({ queryKey: ["list", listId] });
    },
  });
}

// Unlike a list
export function useUnlikeList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (listId: string) => {
      const response = await fetch(`/api/lists/${listId}/like`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to unlike list");
      }
      return response.json();
    },
    onMutate: async (listId) => {
      await queryClient.cancelQueries({ queryKey: ["list", listId, "like"] });

      const previousStatus = queryClient.getQueryData<{ isLiked: boolean }>([
        "list",
        listId,
        "like",
      ]);

      queryClient.setQueryData<{ isLiked: boolean }>(
        ["list", listId, "like"],
        { isLiked: false }
      );

      return { previousStatus };
    },
    onError: (err, listId, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(
          ["list", listId, "like"],
          context.previousStatus
        );
      }
    },
    onSuccess: (_, listId) => {
      queryClient.invalidateQueries({ queryKey: ["list", listId, "like"] });
      queryClient.invalidateQueries({ queryKey: ["lists", "liked"] });
      queryClient.invalidateQueries({ queryKey: ["public-lists"] });
      queryClient.invalidateQueries({ queryKey: ["list", listId] });
    },
  });
}

// Check if current user has liked a list
export function useIsListLiked(listId: string | null) {
  return useQuery<{ isLiked: boolean }>({
    queryKey: ["list", listId, "like"],
    queryFn: async () => {
      if (!listId) return { isLiked: false };
      const response = await fetch(`/api/lists/${listId}/like`);
      if (!response.ok) {
        return { isLiked: false };
      }
      return response.json();
    },
    enabled: !!listId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Get user's liked lists
export function useLikedLists() {
  return useQuery({
    queryKey: ["lists", "liked"],
    queryFn: async () => {
      const response = await fetch("/api/lists/liked");
      if (!response.ok) {
        throw new Error("Failed to fetch liked lists");
      }
      const data = await response.json();
      return data.lists || [];
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

